
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
  methods: {
    reloadPage(){
      const url = window.location.href.split('?')[0];
      window.location.replace(url);
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
        <v-row>
          <v-col cols='3'></v-col>
          <v-col cols='3'>
            <v-btn color="primary" @click="messageText=''">OK</v-btn>
          </v-col>
          <v-col cols='3'>
            <v-btn color="primary" v-if="type==='error'" @click="reloadPage()">Reload page</v-btn>
          </v-col>
          <v-col cols='3'></v-col>
        </v-row>
      </v-card-actions>
    </v-card>
  </v-dialog>
  `
}