  
  // Listen for a message from the iframe, so that we can resize it and/or scroll 
  // to anchors. This should only be sent when the iframe contains HTML.
  addEventListener('message', function(e) {
    const d = JSON.parse(e.data);
    if(d.hasOwnProperty('height')){
      if (isNaN(d.height)) return;
      const iframe = document.querySelector('#ft3_html_iframe');
      if(iframe !== null){
        const resizeTo = parseInt(d.height);// + 10;
        iframe.style.height = resizeTo + 'px';
      }
    }else if(d.hasOwnProperty('scroll')){
      if(isNaN(d.scroll.left) || isNaN(d.scroll.top)) return;
      const iframeOffset = $("#ft3_html_iframe").offset();
      // Assume the iframe is near the top to prevent the scrolled-to
      // element being hidden by the scrollbar
      iframeOffset.top = 0;
      window.scrollTo(d.scroll.left, d.scroll.top + iframeOffset.top);
    }
  }, false);