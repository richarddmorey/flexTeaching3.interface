
ft3_read_file_text <- function(path){
  if(!file.exists(path))
    stop('File ', path, ' not found.')
  to.read <- file(path, "rb")
  on.exit({
    close(to.read)
  })
  readChar(to.read, file.size(path))
}
