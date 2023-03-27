
library(flexTeaching3.api)


flexTeaching3.api::ft3_options(assignments_pkg = 'flexTeaching3.cardiff')

flexTeaching3.interface::ft3_serve_interface(
  api_location = 'http://localhost:8080',
  log_options = list(level = 'debug')
  )

