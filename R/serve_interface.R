
#' Title
#'
#' @param api location
#' @param assignments_pkg 
#' @param http_port 
#' @param log_options
#'
#' @return
#' @export
#' @importFrom RestRserve Application BackendRserve CORSMiddleware
#' @importFrom readr read_file
#' @importFrom assertthat assert_that is.dir
#' @importFrom RCurl url.exists
#' @importFrom flexTeaching3.api ft3_options
#'
#' @examples
ft3_serve_interface <- function(
  api_location = NULL,
  assignments_pkg = flexTeaching3.api::ft3_options('assignments_pkg'),
  http_port = 8081, 
  log_options = list(level = 'off')
)
{
  
  # Check to make sure we can access the api
  assignments_url <- paste0(api_location, '/ft3/api/v1/assignments')
  if(!RCurl::url.exists(assignments_url))
    stop('The API at ', api_location,' could not be reached.', call. = FALSE)

  app = RestRserve::Application$new(
    middleware = list(RestRserve::CORSMiddleware$new())
  )
  
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
        readr::read_file() -> html_content
      
      html_content |>
        gsub(x = _,
             pattern = '<!---FT3_API_LOCATION--->',
             replacement = api_location, 
             fixed = TRUE) -> html_content
      
      if(!is.null(apkg_dir)){
        headers_fn <- file.path(apkg_dir, 'support/headers.html') 
        headers_content <- ifelse(file.exists(headers_fn), readr::read_file(headers_fn), '')

        footers_fn <- file.path(apkg_dir, 'support/footers.html') 
        footers_content <- ifelse(file.exists(footers_fn), readr::read_file(footers_fn), '')
      
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
  
  app$logger = do.call(what = RestRserve::Logger$new, args = log_options)
  backend = RestRserve::BackendRserve$new()
  backend$start(app, http_port = http_port)
}
