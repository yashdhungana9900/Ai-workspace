import {
  Bell,
  ChevronDown,
  Command,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

function ProductShell({
  children,
  user,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onLogout,
}) {
  return (
    <div className="product-shell">
      <aside className="product-sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={16} strokeWidth={2.2} />
          </div>

          <span className="brand-name">AI Workspace</span>
        </div>

        <button className="workspace-switcher">
          <div className="workspace-avatar">
            {(user?.first_name || user?.username || "A")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="workspace-copy">
            <span className="workspace-title">Personal</span>
            <span className="workspace-meta">Workspace</span>
          </div>

          <ChevronDown size={15} />
        </button>

        <div className="sidebar-actions">
          <button
            className="sidebar-action primary"
            onClick={onNewConversation}
          >
            <Plus size={17} />

            <span>New conversation</span>

            <span className="keyboard-hint">
              <Command size={11} />
              K
            </span>
          </button>

          <button className="sidebar-action">
            <Search size={17} />

            <span>Search</span>

            <span className="keyboard-hint">/</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Recent</div>

          {conversations.length === 0 ? (
            <div className="empty-conversations">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`conversation-link ${
                  activeConversationId === conversation.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  onSelectConversation(conversation.id)
                }
              >
                {conversation.title}
              </button>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-footer-link">
            <Bell size={17} />
            Notifications
          </button>

          <button className="sidebar-footer-link">
            <Settings size={17} />
            Settings
          </button>

          <button
            className="sidebar-footer-link"
            onClick={onLogout}
          >
            <LogOut size={17} />
            Log out
          </button>

          <div className="account">
            <div className="account-avatar">
              {(user?.first_name || user?.username || "Y")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="account-copy">
              <span className="account-name">
                {user?.first_name || user?.username || "User"}
              </span>

              <span className="account-meta">
                {user?.email || "Personal account"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="product-main">
        {children}
      </main>
    </div>
  );
}

export default ProductShell;