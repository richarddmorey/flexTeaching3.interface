FROM docker.io/rocker/r-ver:4.2
LABEL maintainer="Richard D. Morey"

ARG ASN_GITHUB=richarddmorey/flexTeaching3.examples

ARG ASN_NAME=flexTeaching3.examples
ENV ASN_NAME="${ASN_NAME}"

ARG API_LOCATION=http://localhost
ENV API_LOCATION="${API_LOCATION}"

RUN mkdir /home/ft3
COPY .Renviron .Rprofile /home/ft3/

WORKDIR /home/ft3

EXPOSE 8080
EXPOSE 8081

RUN mkdir -p /home/ft3/logs
VOLUME /home/ft3/logs

# Ubuntu dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  && apt-get install -y libcairo2-dev libxt-dev curl pandoc imagemagick \
     libmagick++-6.q16-dev librsvg2-dev nodejs npm \
     libcurl4-openssl-dev libharfbuzz-icu0 wget cmake \
  && rm -rf /var/lib/apt/lists/*

# Install other packages we'll use alongside flexTeaching3
# For some reason jdenticon is not showing up in the repo, so specify
RUN Rscript -e "\
  install.packages('remotes'); \
  install.packages('jdenticon', repos='http://cran.us.r-project.org'); \
  "

# Install main flexTeaching3 packages
RUN Rscript -e "\
  remotes::install_github('richarddmorey/flexTeaching3.interface', \
  dependencies = TRUE) \
  "

# Install assignment package
RUN Rscript -e "remotes::install_github('$ASN_GITHUB', \
  dependencies = TRUE, \ 
  force = TRUE) ; \
  "

# Setup packages
RUN Rscript -e "\
  tinytex::install_tinytex(); \
  jdenticon::jdenticon_npm_install(force = TRUE); \
  "

CMD Rscript -e "\
  api_location='$API_LOCATION'; \
  assignments_pkg='$ASN_NAME'; \
  logdir='/home/ft3/logs'; \
  system.file( \
    'start_interface.R', \
    package = 'flexTeaching3.interface' \
    ) |> source()"

