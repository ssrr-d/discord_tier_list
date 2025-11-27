class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    set(messageId, data) {
        this.sessions.set(messageId, data);
    }

    get(messageId) {
        return this.sessions.get(messageId);
    }

    delete(messageId) {
        this.sessions.delete(messageId);
    }
}

const sessionManager = new SessionManager();
module.exports = { sessionManager };
