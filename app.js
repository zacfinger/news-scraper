const getDomain = (url) => {

    var n = url.indexOf("//");
  
    if (n != -1){
        url = url.substring(n + 2);
        n = url.indexOf("www");
        if(n != -1){
            url = url.substring(n + 4);
        }
    }

  n = url.indexOf("/");
  if(n != -1){
        url = url.substring(0, n);
  }

  return url;
}

module.exports.getDomain = getDomain;