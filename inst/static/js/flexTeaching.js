import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'

const indirectEval = eval;

function typeset(code) {
  MathJax.startup.promise = MathJax.startup.promise
    .then(() => MathJax.typesetPromise(code()))
    .catch((err) => console.log('Typeset failed: ' + err.message));
  return MathJax.startup.promise;
}

// https://stackoverflow.com/a/901144/1129889
const params = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});

createApp({
  props: {
    ft_api: {
      type: String,
      required: true
    }
  },
  data() {
    return { 
      ft_id: params.id !== null ? params.id.trim() : '',
      ft_seed: params.seed !== null ? params.seed.trim() : 's33d',
      ft_buttons: [],
      ft_solutions: params.solutions !== null ? params.solutions === 'true' : false,
      ft_locked: params.lock !== null ? params.lock === 'true' : false,
      ft_masterseed: '',
      ft_content: '',
      ft_new_content_config: {},
      ft_assignment_mode: params.assignment_mode !== null ? params.assignment_mode === 'true' : false,
      ft_assignments: [],
      ft_assignment: '',
      ft_identicon: '',
      ft_javascript: '',
      ft_pars: {},
      loading: true,
      error: false,
      error_text: "",
      assignments_loaded: false,
      immediateUpdateWhenCached: true
    }
  },
  methods: {
    downloadFile(url){
      window.open(url);
    },
    async typesetMathjax(){
      await typeset(() => {
          const math = document.querySelector('#ft_content');
          return [math];
          });
    },
    update_content_and_buttons(){
      this.loading = true;
      this.new_content()
        .then(_ => {
          return this.new_buttons();
        });
    },
    async new_buttons() {
      const url = `${this.ft_api}/ft3/api/v1/assignments/${this.ft_assignment}/files`
      const response = await fetch(url);
      const { file_list: file_list } = await response.json();

      const settings = 
        `id=${this.ft_id.trim()}&` +
        `seed=${this.ft_seed.trim()}&` +
        `solutions=${this.ft_solutions}&` +
        `assignment_mode=${this.ft_assignment_mode}`;

      const buttons = Object.keys(file_list).map(function(key){
        return {
          label: file_list[key].label,
          icon: file_list[key].icon,
          url: url + `/${encodeURIComponent(key)}?${settings}`
          }
      });
      this.ft_buttons = buttons;
    },
    async new_content() {
      const settings = 
        `id=${this.ft_id.trim()}&` +
        `seed=${this.ft_seed.trim()}&` +
        `solutions=${this.ft_solutions}&` +
        `assignment_mode=${this.ft_assignment_mode}`;
      const url = `${this.ft_api}/ft3/api/v1/assignments/${this.ft_assignment}`;
      // https://jasonwatmore.com/post/2021/10/09/fetch-error-handling-for-failed-http-responses-and-network-errors
      fetch(`${url}/configuration?${settings}`)
        .then(async response => {
          const isJson = response.headers.get('content-type')?.includes('application/json');
          const data = isJson ? await response.json() : null;

          // check for error response
          if (!response.ok) {
            // get error message from body or default to response status
            const error = (data && data.detail) || ('Error: '+ response.status);
            this.error = true;
            this.error_text = error;
            return Promise.reject(error);
          }
          data.configuration.url = url;
          data.configuration.settings = settings;
          this.ft_new_content_config = data.configuration;
      })
      .catch(error => {
        this.loading = false;
        this.error = true;
        this.error_text = error;
      });
    },
    async updateSeed() {
      const masterseed = this.ft_masterseed;
      if(masterseed === '') return;
      const url = 
        `${this.ft_api}/ft3/api/v1/assignments/${this.ft_assignment}` +
        `/seed?masterseed=${masterseed}`;
      const response = await fetch(url);
      const { pars: pars } = await response.json();
      this.ft_seed = pars.seed;
    },
    async checkCache() {
      const settings = 
        `id=${this.ft_id.trim()}&` +
        `seed=${this.ft_seed.trim()}&` +
        `solutions=${this.ft_solutions}&` +
        `assignment_mode=${this.ft_assignment_mode}`;
      const url = `${this.ft_api}/ft3/api/v1/assignments/${this.ft_assignment}`;
      const response = await fetch(`${url}/cachekey?${settings}`);
      const { cached: cached } = await response.json();

      return cached;
    }
  },
  watch: {
    ft_new_content_config: {
      async handler(config, oldConfig) {
        const settings = config.settings;
        const url = config.url;
        var javascript = '';
        if(config.file_ext === 'html'){
          if(config.iframe){
            this.ft_content = `<iframe id="ft3_html_iframe" class="ft3_content ft3_content_html" src="${url}?${settings}"></iframe>`;
          }else{
            javascript = config.js;
            fetch(`${url}?${settings}`)
              .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await response.json() : null;

                // check for error response
                if (!response.ok) {
                  // get error message from body or default to response status
                  const error = (data && data.detail) || ('Error: '+ response.status);
                  this.error = true;
                  this.error_text = error;
                  return Promise.reject(error);
                }
                const content = await response.text();
                this.ft_content = content;
              })
              .catch(error => {
                this.loading = false;
                this.error = true;
                this.error_text = error;
              });
          }
        }else if(config.file_ext === 'pdf'){
          this.ft_content = `<iframe class="ft3_content ft3_content_pdf" src="${url}?${settings}"></iframe>`;

        }else{
          this.error = true;
          this.error_text = 'Error: Content type was not HTML or PDF. Please contact the administrator and let them know the assignment is misconfigured.'
        }
        this.ft_pars = config.pars;
        this.ft_identicon = config.fingerprint;
        this.loading = false;
        this.ft_javascript = javascript;
      },
      deep: true,
      immediate: false
    },
    query_string(qs){
      if(this.assignments_loaded)
        window.history.replaceState(null, null, qs);
      if(this.outOfDate){
        this.checkCache()
          .then((cached) => {
            if(this.immediateUpdateWhenCached && cached && this.outOfDate){
              this.update_content_and_buttons();
            }
        });
      }
    },
    ft_assignment_mode(assignment_mode){
      this.update_content_and_buttons();
    },
    ft_assignment(assignment){
      this.updateSeed()
        .then(_ => {
          this.update_content_and_buttons();
        })
    },
    assignments_loaded(loaded){
     this.loading = !loaded;
     if(loaded)
        this.ft_assignment = params.assignment !== null ? params.assignment : this.ft_assignments[0].children[0].id;
    },
    ft_solutions(solutions) {
      this.update_content_and_buttons();
    },
    ft_masterseed(masterseed){
      if(masterseed !== '') this.updateSeed();
    },
    ft_content(content){
      this.$nextTick(function () {
        const div = document.querySelector('#ft_content').querySelector('iframe');
        if(div === null || div.length===0){
          this.typesetMathjax();
          indirectEval(this.ft_javascript);
        }
      });
    }
  },
  computed: {
    outOfDate() {
      if(this.ft_pars.id === undefined){
        return true;
      }
    
      const id_mismatch = this.ft_id.trim() !== this.ft_pars.id.trim();
      // If we're in assignment mode, then the seed and solutions 
      // are irrelevant (they will be ignored)
      const seed_mismatch = (this.ft_seed.trim() !== this.ft_pars.seed.trim() && !this.ft_pars.assignment_mode);
      const solutions_mismatch = (this.ft_solutions !== this.ft_pars.solutions && !this.ft_pars.assignment_mode);
      const mode_mismatch = this.ft_assignment_mode !== this.ft_pars.assignment_mode;
      const assignment_mismatch = this.ft_assignment !== this.ft_pars.assignment;
      
      return id_mismatch || seed_mismatch || solutions_mismatch || mode_mismatch || assignment_mismatch;
    },
    identicon_html() {
      return jdenticon.toSvg(this.ft_identicon, 100);
    },
    query_string() {
      return `?assignment=${encodeURIComponent(this.ft_assignment)}&id=${encodeURIComponent(this.ft_id.trim())}&seed=${encodeURIComponent(this.ft_seed.trim())}&solutions=${this.ft_solutions}&assignment_mode=${this.ft_assignment_mode}`
    }
  },
  async created() {
    const a = params.assignment === undefined ? '' : `?assignment=${params.assignment}`;
    const response = await fetch(`${this.ft_api}/ft3/api/v1/assignments${a}`);
    this.ft_assignments = await response.json();
    this.assignments_loaded = true;
  }
},
{
    ft_api: document.querySelector('#flexTeaching-app').dataset.apiUrl
})
.mount('#flexTeaching-app')
