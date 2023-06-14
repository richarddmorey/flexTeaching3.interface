
export async function fetchContent(url, options, errorFunc, thenFunc){
  
  try{
    const response = await fetch(url, options);
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;
        
    // check for error response
	  if (!response.ok) {
	    // get error message from body or default to response status
	    const error = (isJson && data.detail) || (`Error:  ${response.status}`);
	    throw new Error(error);
	  }
	  
	  if(isJson){
      return typeof thenFunc === 'function' ? await thenFunc(data) : data;
    }else{
      return typeof thenFunc === 'function' ? await thenFunc(response) : response;
    }
  }
  catch(error){
      return typeof errorFunc === 'function' ? errorFunc(error) : error;  
  }
}  
  


export function typeset(code) {
  MathJax.startup.promise = MathJax.startup.promise
    .then(() => MathJax.typesetPromise(code()))
    .catch((err) => console.log('Typeset failed: ' + err.message));
  return MathJax.startup.promise;
}

export async function createFileDownload( url, auth_token ){
  let filename = '';
  const options = auth_token ? { headers: {Authorization: `Bearer ${auth_token}`} } : {};
  
  fetch(url, options)
  .then((response) => {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? response.json() : null;
  
    // check for error response
	  if (!response.ok) {
	    // get error message from body or default to response status
	    const error = (isJson && data.detail) || (`Error:  ${response.status}`);
	    throw new Error(error);
	  }

    const disposition = response.headers.get('Content-Disposition');
    if(!disposition)
      throw new Error('Content disposition header not found. Cannot create file name for file download.');
    filename = disposition.split(/;(.+)/)[1].split(/=(.+)/)[1];
    if (filename.toLowerCase().startsWith("utf-8''"))
      filename = decodeURIComponent(filename.replace(/utf-8''/i, ''));
    else
      filename = filename.replace(/['"]/g, '');
    return response.blob();
  })
  .then((blob) => {
    var blob_url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = blob_url;
    a.download = filename;
    document.body.appendChild(a); // append the element to the dom
    a.click();
    a.remove(); // afterwards, remove the element  
    setTimeout( () => {
        // free up the memory
        URL.revokeObjectURL(blob_url);
      }, 5000);
  })
  .catch((error)=>console.error(error));
}
