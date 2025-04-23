const formatISTDate = (date) => {
  const options = {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  return new Date(date).toLocaleDateString("en-IN", options);
};

// Helper functions for IST time formatting
const formatISTTime = (date) => {
  return new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const getFullISTDateTime = (date) => {
  return `${formatISTDate(date)} ${formatISTTime(date)} IST`;
};

// exports
module.exports = {
  formatISTTime,
  formatISTDate,
  getFullISTDateTime,
};
