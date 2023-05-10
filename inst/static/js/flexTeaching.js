const { createApp } = Vue;
const { createVuetify } = Vuetify
const vuetify = createVuetify()

const indirectEval = eval;
const app_settings = JSON.parse(
  atob(
    document.querySelector('#flexTeaching-app').dataset.settings
    )
  );

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
    },
    ft_practice_mode_message: {
      type: String,
      required: true
    },
    ft_assignment_mode_message: {
      type: String,
      required: true
    },
    ft_auth_token: {
      type: String,
      required: false
    },
    ft_initial_assignment_string: {
      type: String,
      required: true
    }
  },
  data() {
    return { 
      switch_mode_dialog: false,
      drawer: true,
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
    copySeed() {
      navigator.clipboard.writeText(this.ft_seed);
    },
    downloadFile(url){
      let filename = '';
      fetch(url,
      {
        headers: {Authorization: `Bearer ${this.ft_auth_token}`}
      })
      .then((response) => {
            const disposition = response.headers.get('Content-Disposition');
            filename = disposition.split(/;(.+)/)[1].split(/=(.+)/)[1];
            if (filename.toLowerCase().startsWith("utf-8''"))
              filename = decodeURIComponent(filename.replace(/utf-8''/i, ''));
            else
              filename = filename.replace(/['"]/g, '');
            return response.blob();
      })
      .then((blob) => {
        var blob_url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = blob_url;
        a.download = filename;
        document.body.appendChild(a); // append the element to the dom
        a.click();
        a.remove(); // afterwards, remove the element  
        setTimeout( () => {
            // free up the memory
            URL.revokeObjectURL(blob_url);
          }, 5000);
      });
      
    },
    async typesetMathjax_hljs(){
      await typeset(() => {
          const el = document.querySelector('#ft_content');
          return [el];
          });
      document.querySelectorAll('#ft_content pre code').forEach((el)=>{
        hljs.highlightElement(el.parentNode);
      })
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
      const response = await fetch(url, {
        headers: {Authorization: `Bearer ${this.ft_auth_token}`}
      });
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
      fetch(`${url}/configuration?${settings}`,
      {
        headers: {Authorization: `Bearer ${this.ft_auth_token}`}
      })
        .then(async response => {
          const isJson = response.headers.get('content-type')?.includes('application/json');
          const data = isJson ? await response.json() : null;

          // check for error response
          if (!response.ok) {
            // get error message from body or default to response status
            const error = (data && data.detail) || ('Error: '+ response.status);
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
      const response = await fetch(url, {
        headers: {Authorization: `Bearer ${this.ft_auth_token}`}
      });
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
      const response = await fetch(`${url}/cachekey?${settings}`, {
        headers: {Authorization: `Bearer ${this.ft_auth_token}`}
      });
      const { cached: cached } = await response.json();

      return cached;
    }
  },
  watch: {
    ft_new_content_config: {
      async handler(config, oldConfig) {
        const settings = config.settings;
        const url = `${config.url}?${settings}`;
        const javascript = config.file_ext === 'html' && !config.iframe ? config.js : '';
        fetch(url, {
          headers: {Authorization: `Bearer ${this.ft_auth_token}`}
        })
        .then(async response => {
          const isJson = response.headers.get('content-type')?.includes('application/json');
          const data = isJson ? await response.json() : null;

          // check for error response
          if (!response.ok) {
            // get error message from body or default to response status
            const error = (data && data.detail) || ('Error: '+ response.status);
            return Promise.reject(error);
          }
          if(config.file_ext === 'html' && !config.iframe){
            const content = await response.text();
            // Destroy the content then remake, so that DOM elements are
            // considered "new" (is there a better way to do this?)
            this.ft_content = '';
            this.$nextTick(() => {
              this.ft_content = content;
              this.typesetMathjax_hljs();
            });
            return;
          } 
          // Anything below means we are using an iframe
          if(config.file_ext !== 'html' && config.file_ext !== 'pdf'){
            return Promise.reject('Error: Content file extension was of unexpected type.');
          }
          const blob = await response.blob();
          const blob_url = URL.createObjectURL(blob);
          if(config.file_ext === 'html'){
            this.ft_content = `<iframe id="ft3_html_iframe" class="ft3_content ft3_content_html" src="${blob_url}"></iframe>`;
          }else if(config.file_ext === 'pdf'){
            this.ft_content = `<iframe class="ft3_content ft3_content_pdf" src="${blob_url}"></iframe>`;
          }
          setTimeout( () => {
            // free up the memory
            URL.revokeObjectURL(blob_url);
          }, 5000);
          return;
        })
        .then(()=>{
          this.ft_pars = config.pars;
          this.ft_identicon = config.fingerprint;
          this.loading = false;
          this.ft_javascript = javascript;
        })
        .catch(error => {
          this.loading = false;
          this.error = true;
          this.error_text = error;
        });
      },
      deep: true,
      immediate: false
    },
    query_string(qs){
      if(this.assignments_loaded)
        window.history.replaceState(null, null, `${qs}&lock=${this.ft_locked}`);
      if(this.outOfDate){
        this.checkCache()
          .then((cached) => {
            if(this.immediateUpdateWhenCached && cached && this.outOfDate){
              this.update_content_and_buttons();
            }
        });
      }
    },
    ft_assignment_mode: {
      handler(assignment_mode){
        if(this.assignments_loaded) this.update_content_and_buttons();
        this.switch_mode_dialog = 
          (assignment_mode && this.ft_assignment_mode_message !== '') || 
          (!assignment_mode && this.ft_practice_mode_message !== '');
        },
        immediate: true
    },
    ft_assignment(assignment){
      this.updateSeed()
        .then(_ => {
          this.update_content_and_buttons();
        })
    },
    assignments_loaded(loaded){
     this.loading = !loaded;
     // find first non-header assignment
     var first_assignment;
     for(var i=0; this.ft_assignments.length; i++){
      if(this.ft_assignments[i].type === undefined){
        first_assignment = this.ft_assignments[i].value;
        break;
      }
     }
     if(loaded)
        this.ft_assignment = params.assignment !== null ? params.assignment : first_assignment;
    },
    ft_solutions(solutions) {
      this.update_content_and_buttons();
    },
    ft_masterseed(masterseed){
      if(masterseed !== '') this.updateSeed();
    },
    loading(lng){
      this.$nextTick(function () {
        const div = document.querySelector('#ft_content').querySelector('iframe');
        if(!lng && (div === null || div.length===0)){
          // this.typesetMathjax_hljs();
          indirectEval(this.ft_javascript);
        }
      });
    },
    error(err){
      if(!err) this.error_text = '';
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
    fetch(`${this.ft_api}/ft3/api/v1/assignments${this.ft_initial_assignment_string}`, {
        headers: {Authorization: `Bearer ${this.ft_auth_token}`}
    })
    .then(async response => {
        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json() : null;

        // check for error response
        if (!response.ok) {
          // get error message from body or default to response status
          const error = (data && data.detail) || ('Error: '+ response.status);
          return Promise.reject(error);
        }
        // Recode for v-select
        this.ft_assignments = data.flatMap((el) => {
	        return [ 
  	        { title: el.text, type: 'header' }, 
            el.children.map( (el) => { 
              return { title: el.text, value: el.id, disabled: el.disabled } 
              })
          ].flat()
        });
        this.assignments_loaded = true;
      })
    .catch(error => {
      this.loading = false;
      this.error = true;
      this.error_text = error;
    });
  }
},
{
    ft_api: app_settings.api_location,
    ft_auth_token: params.token !== null ? params.token : '',
    ft_initial_assignment_string: params.assignment === undefined ? '' : `?assignment=${params.assignment}`,
    ft_practice_mode_message: app_settings.practice_mode_message,
    ft_assignment_mode_message: app_settings.assignment_mode_message
})
.use(vuetify)
.mount('#flexTeaching-app')
