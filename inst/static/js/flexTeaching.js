const { createApp } = Vue;
const { createVuetify } = Vuetify;

import assignmentsList from './ft3_components/assignmentsList.js';
import modeSwitcher from './ft3_components/modeSwitcher.js';
import seedInput from './ft3_components/seedInput.js';
import errorModal from './ft3_components/errorModal.js';
import loadingOverlay from './ft3_components/loadingOverlay.js';

import { fetchContent, typeset, createFileDownload } from './ft3_components/ft3_utilities.js';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval
const indirectEval = eval;

// Get the settings that were injected by flexteaching3.interface
const app_settings = JSON.parse(
  atob(
    document.querySelector('#flexTeaching-app').dataset.settings
    )
  );

// Get the params from the query string as default values (some to
// be passed as props): see https://stackoverflow.com/a/901144/1129889
const params = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});

createApp({
  components: {
    loadingOverlay,
    assignmentsList,
    modeSwitcher,
    seedInput,
    errorModal
  },
  props: {
    ft_api: {
      type: String,
      required: true
    },
    ft_practice_mode_message: {
      type: String,
      required: false
    },
    ft_assignment_mode_message: {
      type: String,
      required: false
    },
    ft_auth_token: {
      type: String,
      required: false
    },
    ft_initial_assignment: {
      type: String,
      required: false
    },
    ft_initial_mode: {
      type: Boolean,
      required: false
    },
    ft_initial_seed: {
      type: String,
      required: false
    },
    ft_initial_solutions: {
      type: Boolean,
      required: false
    },
    ft_initial_id: {
      type: String,
      required: false
    },
    ft_locked: {
      type: Boolean,
      required: false
    },
    immediateUpdateWhenCached: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return { 
      ft_assignment_mode: this.ft_initial_mode,
      ft_id: this.ft_initial_id,
      ft_solutions: this.ft_initial_solutions,
      ft_seed: this.ft_initial_seed,
      ft_buttons: [],
      ft_content: '',
      ft_new_content_config: {},
      ft_assignment: '',
      ft_identicon: '',
      ft_javascript: '',
      ft_pars: {},
      assignments_loaded: false,
      loading: true,
      showSidebar: true,
    }
  },
  methods: {
    modeSwitch(assignmentMode){
      this.ft_assignment_mode = assignmentMode;
      if(this.assignments_loaded)
        this.update_content_and_buttons();
    },
    assignmentsLoaded(){
      this.loading = false;
      this.assignments_loaded = true;
    },
    newAssignment(assignment){
      this.ft_assignment = assignment;
      this.$refs.seedInputComponent.assignment = assignment;
      this.$refs.seedInputComponent.computeSeed()
        .then(_=>{
          this.update_content_and_buttons();
        });
    },
    newSeed(seed, trigger){
      this.ft_seed = seed;
      if(trigger)
        this.update_content_and_buttons();
    },
    displayError(when, error){
      this.$refs.errorModalComponent.errorText = `There was an error when ${when}: ${error}`;
    },
    async downloadFile(url){
      await createFileDownload( url, this.ft_auth_token);
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
      fetchContent(
        `${url}/configuration?${settings}`, 
        this.ft_auth_token ? { headers: { Authorization: `Bearer ${this.ft_auth_token}` } } : {} )
      .then((data)=>{
        data.configuration.url = url;
        data.configuration.settings = settings;
        this.ft_new_content_config = data.configuration;
      })
      .catch((error)=>{
        this.displayError('getting new content settings', error);
      });
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
          this.displayError('getting new content', error);
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
    ft_solutions(solutions) {
      this.update_content_and_buttons();
    },
    loading(lng){
      this.$refs.loadingOverlayComponent.loading = lng;
      this.$nextTick(function () {
        const div = document.querySelector('#ft_content').querySelector('iframe');
        if(!lng && (div === null || div.length===0)){
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
      // If we're in assignment mode, then the seed and solutions are irrelevant 
      // (they will be ignored)
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
  }
},
{
    // Props
    ft_api: app_settings.api_location,
    ft_auth_token: params.token,
    ft_initial_assignment: params.assignment,
    ft_initial_mode: params.assignment_mode ? params.assignment_mode === 'true' : false,
    ft_initial_seed: params.seed ? params.seed.trim() : 's33d',
    ft_initial_solutions: params.solutions ? params.solutions === 'true' : false,
    ft_initial_id: params.id ? params.id.trim() : '',
    ft_practice_mode_message: app_settings.practice_mode_message,
    ft_assignment_mode_message: app_settings.assignment_mode_message,
    ft_locked: params.lock ? params.lock === 'true' : false,
    immediateUpdateWhenCached: true
})
.use(createVuetify())
.mount('#flexTeaching-app');



