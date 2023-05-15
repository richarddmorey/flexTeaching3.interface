
export default {
  props: {
    assignmentModeInit: Boolean,
    assignmentModeMessage: String,
    practiceModeMessage: String,
    locked: Boolean
  },
  emits: ['modeSwitch'],
  data() {
    return {
      assignmentMode: this.assignmentModeInit,
      dialog: false
    }
  },
  watch: {
    assignmentMode: {
      handler(m){
        this.$emit('modeSwitch', m);
        if(m && this.assignmentModeMessage && this.assignmentModeMessage !=='')
          this.dialog = true;
        if(!m && this.practiceModeMessage && this.practiceModeMessage !=='')
          this.dialog = true;
      },
      immediate: true
    }
  },
  template: `
    <label class="toggle">
      <input type="checkbox" v-model='assignmentMode' :disabled="locked">
      <span class="slider"></span>
      <span class="labels" data-on="Assignment" data-off="Practice"></span>
    </label>   
    
    <v-dialog
      v-model="dialog"
      width="auto"
      content-class="elevation-25"
    >
      <v-card>
        <v-card-text class="text-left" v-if='!assignmentMode'>{{practiceModeMessage}}
        </v-card-text>
        <v-card-text class="text-left" v-if='assignmentMode'>{{assignmentModeMessage}}
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block @click="dialog = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  `
}