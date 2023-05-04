
ft3_read_file_text <- function(path, ...){
  if(!file.exists(path))
    stop('File ', path, ' not found.')
  to.read <- file(path, "rb")
  on.exit({
    close(to.read)
  })
  # See https://github.com/r-lib/rcmdcheck/issues/152
  # readChar(to.read, file.size(path))
  readChar(to.read, nchars = file.size(path), useBytes = TRUE, ...) |>
    enc2utf8()
}

