
# https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#tabnabbing
prevent_tabnab = RestRserve::Middleware$new(
  process_request = function(request, response) TRUE,
  process_response = function(request, response){
    response$set_header('Referrer-Policy', 'no-referrer')
  },
  id = "prev_tabnab"
)

#' Title
#'
#' @param api_location The URL for the api (without the '/ft3/api/v1/' appended)
#' @param assignments_pkg Package containing the assignments
#' @param practice_mode_message Message to give when switching to practice mode. Set to empty string to disable.
#' @param assignment_mode_message Message to give when switching to assignment mode. Set to empty string to disable.
#' @param http_port Port on which to start the server
#' @param backend RestRserve backend
#' @param ... Further arguments to be passed to the RestRserve backend's start() method
#'
#' @return The result from the RestRserve backend's start() method
#' @export
#' @importFrom RestRserve Application BackendRserve CORSMiddleware
#' @importFrom assertthat assert_that is.dir
#' @importFrom RCurl url.exists
#' @importFrom jsonlite toJSON
#' @importFrom RCurl base64Encode
#'
ft3_serve_interface <- function(
  api_location = NULL,
  assignments_pkg,
  practice_mode_message = '',
  assignment_mode_message = '',
  http_port = 8081, 
  backend = RestRserve::BackendRserve$new(),
  ...
)
{

  find.package(assignments_pkg)
  
  # Check to make sure we can access the api
  assignments_url <- paste0(api_location, '/ft3/api/v1/assignments')
  status_code = RCurl::url.exists(assignments_url, .header = TRUE)[['status']] |> as.integer()
  if(
    (as.integer(status_code / 100) != 2) && # "OK" status (in 200s)
    (status_code != 401) # Authentication needed (still ok, for our purposes)
  ){
    stop('The API at ', api_location,' could not be reached.', call. = FALSE)
  }
  app = RestRserve::Application$new(
    middleware = list(RestRserve::CORSMiddleware$new(), prevent_tabnab)
  )
  
  # Use logger lg defined by .onLoad
  app$logger = lg
  
  if(is.null(assignments_pkg)){
    apkg_dir <- NULL
  }else{
    apkg_dir <- system.file(
      'ft3_pkg',
      package = assignments_pkg
    )
    assertthat::assert_that(is.dir(apkg_dir))
  }

  app$add_static(
    path = '/ft3',
    file_path = system.file(
      package = packageName(),
      'static'
    )
  )
  
  app$add_get(
    path = "/ft3/interface.html",
    FUN = function(.req, .res) {
      .res$set_content_type("text/html")
      
      # Insert API location
      
      'interface/index.html' |>
        system.file(package = packageName()) |>
        ft3_read_file_text() -> html_content
      
      list(
        api_location = api_location,
        assignment_mode_message = assignment_mode_message,
        practice_mode_message = practice_mode_message
      ) |>
        jsonlite::toJSON(auto_unbox = TRUE) |>
        RCurl::base64Encode() -> settings
      
      html_content |>
        gsub(x = _,
             pattern = '<!---FT3_SETTINGS--->',
             replacement = settings, 
             fixed = TRUE) -> html_content
      
      if(!is.null(apkg_dir)){
        headers_fn <- file.path(apkg_dir, 'support/headers.html') 
        headers_content <- ifelse(file.exists(headers_fn), ft3_read_file_text(headers_fn), '')

        footers_fn <- file.path(apkg_dir, 'support/footers.html') 
        footers_content <- ifelse(file.exists(footers_fn), ft3_read_file_text(footers_fn), '')
      
        html_content |> 
          gsub(x = _,
            pattern = '<!---FT3_HEADERS--->',
            replacement = headers_content, 
            fixed = TRUE) |>
          gsub(x = _,
             pattern = '<!---FT3_FOOTERS--->',
             replacement = footers_content, 
             fixed = TRUE) -> html_content
      }
      
      .res$set_body(html_content)
    })
  
  # If the assignment package has an inst/ft3_pkg/support/ directory, make 
  # it available as static
  if(!is.null(apkg_dir) && dir.exists(file.path(apkg_dir, 'support')))
    app$add_static(
      path = '/ft3/support',
      file_path = file.path(apkg_dir, 'support')
    )
  
  backend$start(app, http_port = http_port, ...)
}
