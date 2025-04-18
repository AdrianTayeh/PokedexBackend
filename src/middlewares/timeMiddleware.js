function formatDateToLocal(date) {
    return new Date(date).toLocaleString("sv-SE", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  
  function timeMiddleware(req, res, next) {
    const originalSend = res.send;
  
    res.send = function (body) {
      try {
        const jsonBody = JSON.parse(body);
  
        const formatDates = (obj) => {
          for (const key in obj) {
            if (typeof obj[key] === "string" && !isNaN(Date.parse(obj[key]))) {
              obj[key] = formatDateToLocal(obj[key]);
            } else if (typeof obj[key] === "object" && obj[key] !== null) {
              formatDates(obj[key]);
            }
          }
        };
  
        formatDates(jsonBody);
  
        return originalSend.call(this, JSON.stringify(jsonBody));
      } catch (err) {
        return originalSend.call(this, body);
      }
    };
  
    next();
  }
  
  module.exports = timeMiddleware;