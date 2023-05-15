import { fetchContent } from './ft3_utilities.js';

export default {
  props: {
    apiLocation: String,
    assignmentInit: String,
    authToken: String,
    seedInit: String,
    locked: Boolean
  },
  emits: ['updateSeed', 'updateSeedError'],
  expose: ['assignment', 'computeSeed'],
  data() {
    return {
      assignment: this.assignmentInit,
      masterseed: '',
      seed: this.seedInit
    }
  },
  methods: {
    copySeed() {
      navigator.clipboard.writeText(this.seed);
    },
    update(trigger){
      console.log(`Updating seed: ${this.seed}, ${trigger}`);
      this.$emit('updateSeed', this.seed, trigger);
    },
    async computeSeed(){
      if(this.masterseed === '') return;
      const url = 
        `${this.apiLocation}/ft3/api/v1/assignments/${this.assignment}` +
        `/seed?masterseed=${this.masterseed}`;
      const options = this.authToken ? { headers: { Authorization: `Bearer ${this.authToken}` } } : {};
      try {
        const response = await fetch(url, options);
        const { pars: pars } = await response.json();
        this.seed = pars.seed;
        return;
      } catch (error) {
        this.$emit('updateSeedError', 'computing a seed', error)
      } 
    }
  },
  computed: {
    needUpdate(){
      return [this.masterseed, this.assignment];
    }
  },
  watch: {
    needUpdate(){
      this.computeSeed();
    },
    seed(){
      this.update(false);
    }
  },
  template: `
    <v-list>
      <v-list-item>
        <v-tooltip text="Copy seed to clipboard">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" @click="copySeed">&#128203;</v-btn>
          </template>
        </v-tooltip>
        <v-text-field id="ft_seed_textbox" v-model="seed" :disabled='masterseed !== "" || locked' label="Seed" @keyup.enter.native="update(true)"></v-text-field>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item>
        <v-text-field id="ft_masterseed_textbox" v-model="masterseed"  :disabled="locked" label="Master seed" @keyup.enter.native="update(true)"></v-text-field>
      </v-list-item>
    </v-list>
  `
}