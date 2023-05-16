
export default {
  expose: ['errorText'],
  data() {
    return {
      errorText: '',
      dialog: false
    }
  },
  watch: {
    errorText(e){
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
          <v-col cols=2 style='color: red;font-size: 200%;'>&#9888;</v-col>
          <v-col>
            <v-card-text class="text-left">{{errorText}}
            </v-card-text>
          </v-col>
        </v-row>
      </v-container>
      <v-card-actions>
        <v-btn color="primary" block @click="errorText=''">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  `
}