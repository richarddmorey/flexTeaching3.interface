const { defineStore } = Pinia;

import { fetchContent } from './ft3_utilities.js';

export default defineStore('assignmentsStore', {
	state() {
		return {
			assignments: [],
			loaded: false,
			error: false,
			errorText: null
		}
	},
	getters: {
	  nAssignments: (state) => state.assignments.length,
	  firstAssignment: (state) => {
	    return state.nAssignments ? state.assignments[0].children[0].id : null;
	  }
	},
	actions: {
		async retrieveAssignments(api_location, initial_assignment, auth_token) {
			const initial_str = initial_assignment && initial_assignment !== '' ? `?assignment=${initial_assignment}` : '';
			const options = auth_token ? { headers: { Authorization: `Bearer ${auth_token}` } } : {};
			fetchContent(`${api_location}/ft3/api/v1/assignments${initial_str}`, options)
			.then(data => {
			  if(data.length === 0){
			    throw new Error('There were no assignments retrieved.');
			  }
			  this.loaded = true;
			  this.assignments = data;
			 })
			 .catch(error => {
			   this.loaded = false;
				 this.error = true;
				 this.errorText = error;
			 });
		}
	}
});
