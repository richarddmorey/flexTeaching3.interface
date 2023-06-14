import { fetchContent } from './ft3_utilities.js';

export default {
  props: {
    apiLocation: String,
    initialAssignment: String,
    authToken: String,
    locked: Boolean
  },
  emits: ['newAssignment', 'assignmentsLoaded', 'assignmentsLoadingError'],
  data() {
    return {
      assignments: [],
      assignment: null,
			loaded: false,
			error: false,
			errorText: null
    }
  },
  watch: {
    assignment(a){
      this.$emit('newAssignment', a);
    },
    loaded(l){
      if(l && !this.error)
        this.$emit('assignmentsLoaded');
    }
  },
  computed: {
    nAssignments(){
      return this.assignments.length;
    },
	  firstAssignment(){
	    return this.nAssignments ? this.assignments[0].children[0].id : null;
	  },
	  flatAssignments(){
	    // Recode for v-select
      return this.assignments.flatMap((el) => {
			  return [{
				    title: el.text,
					  type: 'header'
				  },
				  el.children.map((el) => {
					return {
						  title: el.text,
						  value: el.id,
						  disabled: el.disabled
					  }
				  })
			   ].flat()
		  });
	  }
  },
  async created() {
    const initialStr = this.initialAssignment && this.initialAssignment !== '' ? `?assignment=${this.initialAssignment}` : '';
		const options = this.authToken ? { headers: { Authorization: `Bearer ${this.authToken}` } } : {};
		fetchContent(`${this.apiLocation}/ft3/api/v1/assignments${initialStr}`, options,
		  (error) => {
		    this.loaded = false;
		    this.$emit('assignmentsLoadingError', 'loading assignments', error);
		  },
		  (data) => {
			 if(data.length === 0){
			   throw new Error('There were no assignments retrieved.');
			 }
			 this.loaded = true;
			 this.assignments = data;
			 this.assignment = this.assignments[0].children[0].id;
			});
  },
  template: `
    <v-autocomplete v-model="assignment" :items="flatAssignments" label="Select assignment:" :disabled="locked" no-data-text='No matching assignments found.'>
      <!-- See: https://github.com/vuetifyjs/vuetify/issues/16792 -->
      <template v-slot:item="{ item, props }">
        <v-divider v-if="item.raw.type === 'divider'"></v-divider>
        <v-list-subheader v-else-if="item.raw.type === 'header'">{{item.title}}</v-list-subheader>
        <v-list-item v-else v-bind="props" :disabled="item.raw.disabled"></v-list-item>
      </template>
    </v-autocomplete>`
}

