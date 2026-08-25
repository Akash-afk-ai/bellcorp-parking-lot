function generateTicketNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BELL-${timestamp}-${random}`;
}

module.exports = { generateTicketNumber };
