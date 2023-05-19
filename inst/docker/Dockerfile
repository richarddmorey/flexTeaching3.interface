FROM rocker/r-ver:4.2
LABEL maintainer="Richard D. Morey"

ARG ASN_GITHUB=richarddmorey/flexTeaching3.examples

ARG ASN_NAME=flexTeaching3.examples
ENV ASN_NAME="${ASN_NAME}"

RUN mkdir /home/ft3
COPY .Renviron .Rprofile /home/ft3/
WORKDIR /home/ft3

EXPOSE 8080
EXPOSE 8081

# Ubuntu dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  && apt-get install -y libcairo2-dev libxt-dev curl pandoc imagemagick \
     libmagick++-6.q16-dev librsvg2-dev nodejs npm \
     libcurl4-openssl-dev libharfbuzz-icu0 wget cmake \
  && rm -rf /var/lib/apt/lists/*

# Install for remotes::install_github
RUN Rscript -e "install.packages('remotes')"

# Install other packages we'll use alongside flexTeaching3
RUN Rscript -e "\
  remotes::install_github('mattroumaya/jdenticon', \
    dependencies = TRUE); \
  jdenticon::jdenticon_npm_install(force = TRUE); \
  install.packages('tinytex'); \
  tinytex::install_tinytex(); \
  "

# Install main flexTeaching3 packages
RUN Rscript -e "remotes::install_github('richarddmorey/flexTeaching3.api', \
    dependencies = TRUE); \
  remotes::install_github('richarddmorey/flexTeaching3.interface', \
    dependencies = TRUE) \
    "

# Install assignment package
RUN Rscript -e "remotes::install_github('$ASN_GITHUB', \
    dependencies = TRUE); \
  "

CMD Rscript -e "assignments_pkg='$ASN_NAME'; system.file('start_interface.R', package = 'flexTeaching3.interface') |> source()"

