const { createApp } = Vue;
const { createVuetify } = Vuetify;

import assignmentsList from './ft3_components/assignmentsList.js';
import modeSwitcher from './ft3_components/modeSwitcher.js';
import seedInput from './ft3_components/seedInput.js';
import messageModal from './ft3_components/messageModal.js';

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
    assignmentsList,
    modeSwitcher,
    seedInput,
    messageModal
  },
  props: {
    apiLocation: {
      type: String,
      required: true
    },
    practiceModeMessage: {
      type: String,
      required: false
    },
    assignmentModeMessage: {
      type: String,
      required: false
    },
    authToken: {
      type: String,
      required: false
    },
    initialAssignment: {
      type: String,
      required: false
    },
    initialMode: {
      type: Boolean,
      required: false
    },
    initialSeed: {
      type: String,
      required: false
    },
    initialSolutions: {
      type: Boolean,
      required: false
    },
    initialId: {
      type: String,
      required: false
    },
    locked: {
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
      // Core data values from inputs
      assignmentMode: this.initialMode,
      id: this.initialId,
      solutions: this.initialSolutions,
      seed: this.initialSeed,
      assignment: '',
      // Others
      identicon: '',
      assignmentsAreLoaded: false,
      loading: false,
      showSidebar: true,
      fetchOptions: this.authToken ? { headers: { Authorization: `Bearer ${this.authToken}` } } : {},
      // Below may be moved to component
      buttons: [],
      content: '',
      contentType: '',
      iframeSrc: '',
      newContentConfig: {},
      javascript: '',
      pars: {},
    }
  },
  methods: {
    queryString(){
      return `?assignment=${encodeURIComponent(this.assignment)}&id=${encodeURIComponent(this.id.trim())}&seed=${encodeURIComponent(this.seed.trim())}&solutions=${this.solutions}&assignment_mode=${this.assignmentMode}`;
    },
    newAssignment(assignment){
      this.assignment = assignment;
      this.$refs.seedInputComponent.assignment = assignment;
      this.$refs.seedInputComponent.computeSeed()
        .then(_=>{
          this.updateContentAndButtons();
        });
    },
    newSeed(seed, trigger){
      this.seed = seed;
      if(trigger)
        this.updateContentAndButtons();
    },
    displayError(when, error){
      this.$refs.errorModalComponent.messageText = `There was an error when ${when}: ${error}`;
    },
    async downloadFile(url){
      await createFileDownload( url, this.authToken);
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
    updateContentAndButtons(){
      if(this.loading) return;
      this.loading = true;
      this.newContent()
        .then(_ => {
          return this.newButtons();
        });
    },
    async newButtons() {
      const url = `${this.apiLocation}/ft3/api/v1/assignments/${this.assignment}/files`;
      const response = await fetch(url, this.fetchOptions);
      const { file_list: file_list } = await response.json();
      
      const qs = this.queryString();
      const buttons = Object.keys(file_list).map(function(key){
        return {
          label: file_list[key].label,
          icon: file_list[key].icon,
          url: url + `/${encodeURIComponent(key)}${qs}`
          }
      });
      this.buttons = buttons;
    },
    async newContent() {
      const url = `${this.apiLocation}/ft3/api/v1/assignments/${this.assignment}`;
      fetchContent(
        `${url}/configuration${this.queryString()}`, 
        this.fetchOptions,
        (error)=>{
          this.displayError(`getting new content settings for assignment ${this.assignment}`, error);
        },
        (data)=>{
          data.configuration.url = url;
          data.configuration.settings = this.queryString();
          this.newContentConfig = data.configuration;
        });
    },
    async checkCache() {
      const url = `${this.apiLocation}/ft3/api/v1/assignments/${this.assignment}`;
      const response = await fetch(`${url}/cachekey${this.queryString()}`, this.fetchOptions );
      const { cached: cached } = await response.json();

      return cached;
    }
  },
  watch: {
    outOfDate(o){
      if(!o || !this.immediateUpdateWhenCached || this.loading) return;
      this.checkCache()
        .then((cached) => {
          if(cached)
            this.updateContentAndButtons();
        });
    },
    newContentConfig: {
      async handler(config, oldConfig) {
        const url = `${config.url}${config.settings}`;
        const javascript = config.file_ext === 'html' && !config.iframe ? config.js : '';
        fetch(url, this.fetchOptions)
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
            this.contentType = 'fragment';
            const content = await response.text();
            // Destroy the content then remake, so that DOM elements are
            // considered "new" (is there a better way to do this?)
            this.content = '';
            this.$nextTick(() => {
              this.content = content;
              this.typesetMathjax_hljs();
            });
            return;
          } 
          // Anything below means we are using an iframe
          if(config.file_ext !== 'html' && config.file_ext !== 'pdf'){
            return Promise.reject('Error: Content file extension was of unexpected type.');
          }
          this.contentType = config.file_ext;
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          this.iframeSrc = blobUrl;
          setTimeout( () => {
            // free up the memory
            URL.revokeObjectURL(blobUrl);
          }, 5000);
          return;
        })
        .then(()=>{
          this.pars = config.pars;
          this.identicon = config.fingerprint;
          this.loading = false;
          this.javascript = javascript;
        })
        .catch(error => {
          this.displayError('getting new content', error);
        });
      },
      deep: true,
      immediate: false
    },
    qs(q){
      if(this.assignmentsAreLoaded)
        window.history.replaceState(null, null, `${q}&lock=${this.locked}`);
    },
    solutions() {
      this.updateContentAndButtons();
    },
    assignmentMode() {
      this.updateContentAndButtons();
    },
    loading(lng){
      if(lng || this.contentType !== 'fragment') return;
      this.$nextTick(function () {
        const div = document.querySelector('#ft_content')
        if(div || div.length!==0){
          indirectEval(this.javascript);
        }
      });
    }
  },
  computed: {
    qs() {
      return this.queryString();
    },
    outOfDate() {
      if(this.pars.id === undefined){
        return true;
      }
      const id_mismatch = this.id.trim() !== this.pars.id.trim();
      // If we're in assignment mode, then the seed and solutions are irrelevant 
      // (they will be ignored)
      const seed_mismatch = (this.seed.trim() !== this.pars.seed.trim() && !this.pars.assignment_mode);
      const solutions_mismatch = (this.solutions !== this.pars.solutions && !this.pars.assignment_mode);
      const mode_mismatch = this.assignmentMode !== this.pars.assignment_mode;
      const assignment_mismatch = this.assignment !== this.pars.assignment;
      
      return id_mismatch || seed_mismatch || solutions_mismatch || mode_mismatch || assignment_mismatch;
    },
    identicon_html() {
      return typeof variable === 'undefined' ? jdenticon.toSvg(this.identicon, 100) : '[Error creating jdenticon]';
    }
  }
},
{
    // Prop values
    apiLocation: app_settings.api_location,
    authToken: params.token,
    initialAssignment: params.assignment,
    initialMode: params.assignment_mode ? params.assignment_mode === 'true' : false,
    initialSeed: params.seed ? params.seed.trim() : 's33d',
    initialSolutions: params.solutions ? params.solutions === 'true' : false,
    initialId: params.id ? params.id.trim() : '',
    practiceModeMessage: app_settings.practice_mode_message,
    assignmentModeMessage: app_settings.assignment_mode_message,
    locked: params.lock ? params.lock === 'true' : false,
    immediateUpdateWhenCached: true
})
.use(createVuetify())
.mount('#flexTeaching-app');



