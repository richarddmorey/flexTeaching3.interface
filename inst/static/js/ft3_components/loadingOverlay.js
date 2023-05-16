
export default {
  data() {
    return {
      loading: true
    }
  },
  template: `
  <v-overlay
    :model-value="loading"
    class="align-center justify-center ft3_overlay_blur"
    persistent
    scroll-strategy='block'
  >
    <v-progress-circular
      color="primary"
      indeterminate
      size="64"
    ></v-progress-circular>
  </v-overlay>
  `
}