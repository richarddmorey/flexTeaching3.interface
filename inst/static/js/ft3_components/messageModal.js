
export default {
  props: {
    type: String
  },
  expose: ['messageText'],
  data() {
    return {
      messageText: '',
      dialog: false
    }
  },
  computed: {
    icon(){
      return this.type === 'error' ? '&#9888;' : '&#128488;'
    },
    style(){
      return this.type === 'error' ? 'color: red;font-size: 200%;' : 'color: gray; font-size: 200%;'
    }
  },
  watch: {
    messageText(e){
      this.dialog = e !== '';
    }
  },
  template: `
    <v-dialog
      v-model="dialog"
      width="auto"
    >
    <v-card>
      <v-container>
        <v-row>
          <v-col cols=2 :style='style' v-html='icon'></v-col>
          <v-col>
            <v-card-text class="text-left">{{messageText}}
            </v-card-text>
          </v-col>
        </v-row>
      </v-container>
      <v-card-actions>
        <v-btn color="primary" block @click="messageText=''">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  `
}