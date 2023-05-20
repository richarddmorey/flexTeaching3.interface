
#' @importFrom utils packageName
#' @importFrom lgr get_logger
.onLoad <- function(...){
  assign(
    "lg",
    lgr::get_logger(utils::packageName()),
    envir = parent.env(environment())
  )
}
