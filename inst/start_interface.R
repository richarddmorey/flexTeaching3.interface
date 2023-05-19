
library(flexTeaching3.api)

flexTeaching3.api::ft3_options(master_secret = 'curious_capybara')

if(exists(assignments_pkg)){
  flexTeaching3.api::ft3_options(assignments_pkg = assignments_pkg)
}else{
  flexTeaching3.api::ft3_options(assignments_pkg = 'flexTeaching3.examples')
}

tmpdir = '/tmp/ft3_scratch'

if(dir.exists(tmpdir)){
  unlink(tmpdir,recursive=TRUE, force=TRUE)
}
dir.create(tmpdir)

flexTeaching3.api::ft3_options(cache_location = tmpdir)
flexTeaching3.api::ft3_options(scratch_dir = tmpdir)
flexTeaching3.api::ft3_options(errors_to_client = TRUE)

api <- flexTeaching3.api::ft3_serve_api(background = TRUE)

flexTeaching3.interface::ft3_serve_interface(
  api_location = 'http://localhost:8080',
  practice_mode_message = 'You are now in practice mode.',
  assignment_mode_message = 'You are now in assignment mode.',
  assignments_pkg = flexTeaching3.api::ft3_options('assignments_pkg')
)


