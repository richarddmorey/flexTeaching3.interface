
library(flexTeaching3.api)
library(lgr)

tmpdir = '/tmp/ft3_scratch'
if(dir.exists(tmpdir)){
  unlink(tmpdir,recursive=TRUE, force=TRUE)
}
dir.create(tmpdir)
logdir = ifelse(exists('logdir'), logdir, tmpdir)

flexTeaching3.api::ft3_options(master_secret = 'curious_capybara')
flexTeaching3.api::ft3_options(cache_location = tmpdir)
flexTeaching3.api::ft3_options(scratch_dir = tmpdir)
flexTeaching3.api::ft3_options(errors_to_client = TRUE)
flexTeaching3.api::ft3_options(
  assignments_pkg = ifelse(exists('assignments_pkg'), assignments_pkg, 'flexTeaching3.examples')
  )

# Use root logger lgr and write to file (both logs will be written to this file)
lgr$set_threshold('debug')
format(Sys.time(), "ft3_log_%Y-%m-%d_%H:%M.json.log") |>
  file.path(logdir, x=_) |>
  lgr::AppenderJson$new() |>
  lgr$add_appender(name = 'json')

# Start RestRserve backend (for both applications)
backend = RestRserve::BackendRserve$new()

api <- flexTeaching3.api::ft3_serve_api(background = TRUE, backend = backend)

flexTeaching3.interface::ft3_serve_interface(
  api_location = 'http://localhost:8080',
  practice_mode_message = 'You are now in practice mode.',
  assignment_mode_message = 'You are now in assignment mode.',
  assignments_pkg = flexTeaching3.api::ft3_options('assignments_pkg'),
  backend = backend
)


