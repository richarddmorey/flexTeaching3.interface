FROM rocker/r-ver:4.2

RUN mkdir /home/ft3

RUN apt-get update && apt-get install -y --no-install-recommends \
  && apt-get install -y libcairo2-dev libxt-dev curl pandoc imagemagick \
     libmagick++-6.q16-dev librsvg2-dev nodejs npm \
     libcurl4-openssl-dev libharfbuzz-icu0 wget \
  && rm -rf /var/lib/apt/lists/*

RUN R -e "install.packages('remotes'); \
  remotes::install_github('richarddmorey/flexTeaching3.api', \
    dependencies = TRUE); \
  remotes::install_github('richarddmorey/flexTeaching3.interface', \
    dependencies = TRUE); \
  remotes::install_github('mattroumaya/jdenticon', \
    dependencies = TRUE); \
  jdenticon::jdenticon_npm_install(force = TRUE); \
  install.packages('tinytex'); \
  tinytex::install_tinytex(); \
  remotes::install_github('richarddmorey/flexTeaching3.examples', \
    dependencies = TRUE); \
  "

EXPOSE 8080
EXPOSE 8081

CMD Rscript -e "system.file('start_interface.R', package = 'flexTeaching3.interface') |> source()"

