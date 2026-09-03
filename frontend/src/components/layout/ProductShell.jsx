import {
  Bell,
  ChevronDown,
  Command,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";

import { useState } from "react";


function ProductShell({
  children,
  user,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onLogout,
}) {
  const [
    openMenuId,
    setOpenMenuId,
  ] = useState(null);


  const [
    editingConversation,
    setEditingConversation,
  ] = useState(null);


  const [
    editingTitle,
    setEditingTitle,
  ] = useState("");


  const [
    deletingConversation,
    setDeletingConversation,
  ] = useState(null);


  function startRename(
    conversation
  ) {
    setEditingConversation(
      conversation
    );

    setEditingTitle(
      conversation.title
    );

    setOpenMenuId(null);
  }


  function cancelRename() {
    setEditingConversation(
      null
    );

    setEditingTitle("");
  }


  async function saveRename() {
    const title =
      editingTitle.trim();

    if (
      !title ||
      !editingConversation
    ) {
      return;
    }

    await onRenameConversation(
      editingConversation.id,
      title
    );

    cancelRename();
  }


  function requestDelete(
    conversation
  ) {
    setDeletingConversation(
      conversation
    );

    setOpenMenuId(null);
  }


  async function confirmDelete() {
    if (
      !deletingConversation
    ) {
      return;
    }

    const conversationId =
      deletingConversation.id;

    setDeletingConversation(
      null
    );

    await onDeleteConversation(
      conversationId
    );
  }


  return (
    <div className="product-shell">

      <aside className="product-sidebar">

        <div className="brand">

          <div className="brand-mark">
            <Sparkles
              size={16}
              strokeWidth={2.2}
            />
          </div>

          <span className="brand-name">
            AI Workspace
          </span>

        </div>


        <button className="workspace-switcher">

          <div className="workspace-avatar">
            {(
              user?.first_name ||
              user?.username ||
              "A"
            )
              .charAt(0)
              .toUpperCase()}
          </div>


          <div className="workspace-copy">

            <span className="workspace-title">
              Personal
            </span>

            <span className="workspace-meta">
              Workspace
            </span>

          </div>


          <ChevronDown size={15} />

        </button>


        <div className="sidebar-actions">

          <button
            className="sidebar-action primary"
            onClick={
              onNewConversation
            }
          >
            <Plus size={17} />

            <span>
              New conversation
            </span>

            <span className="keyboard-hint">
              <Command size={11} />
              K
            </span>
          </button>


          <button className="sidebar-action">

            <Search size={17} />

            <span>
              Search
            </span>

            <span className="keyboard-hint">
              /
            </span>

          </button>

        </div>


        <div className="sidebar-section">

          <div className="sidebar-label">
            Recent
          </div>


          {conversations.length === 0 ? (

            <div className="empty-conversations">
              No conversations yet
            </div>

          ) : (

            conversations.map(
              (conversation) => {

                const isActive =
                  activeConversationId ===
                  conversation.id;

                const isMenuOpen =
                  openMenuId ===
                  conversation.id;


                return (
                  <div
                    className={`conversation-item ${
                      isActive
                        ? "active"
                        : ""
                    }`}
                    key={
                      conversation.id
                    }
                  >

                    <button
                      className="conversation-link"
                      onClick={() =>
                        onSelectConversation(
                          conversation.id
                        )
                      }
                    >
                      <span className="conversation-title">
                        {
                          conversation.title
                        }
                      </span>
                    </button>


                    <button
                      className="conversation-menu-button"
                      aria-label="Conversation options"
                      onClick={(event) => {
                        event.stopPropagation();

                        setOpenMenuId(
                          isMenuOpen
                            ? null
                            : conversation.id
                        );
                      }}
                    >
                      <MoreHorizontal
                        size={16}
                      />
                    </button>


                    {isMenuOpen && (

                      <div className="conversation-menu">

                        <button
                          onClick={() =>
                            startRename(
                              conversation
                            )
                          }
                        >
                          <Pencil
                            size={14}
                          />

                          Rename
                        </button>


                        <button
                          className="danger"
                          onClick={() =>
                            requestDelete(
                              conversation
                            )
                          }
                        >
                          <Trash2
                            size={14}
                          />

                          Delete
                        </button>

                      </div>

                    )}

                  </div>
                );
              }
            )

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
              {(
                user?.first_name ||
                user?.username ||
                "Y"
              )
                .charAt(0)
                .toUpperCase()}
            </div>


            <div className="account-copy">

              <span className="account-name">
                {
                  user?.first_name ||
                  user?.username ||
                  "User"
                }
              </span>

              <span className="account-meta">
                {
                  user?.email ||
                  "Personal account"
                }
              </span>

            </div>

          </div>

        </div>

      </aside>


      <main className="product-main">
        {children}
      </main>


      {editingConversation && (

        <div className="modal-backdrop">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>
                  Rename conversation
                </h2>

                <p>
                  Choose a name that makes
                  this conversation easy to find.
                </p>
              </div>

            </div>


            <input
              className="modal-input"
              value={editingTitle}
              onChange={(event) =>
                setEditingTitle(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  saveRename();
                }

                if (
                  event.key ===
                  "Escape"
                ) {
                  cancelRename();
                }
              }}
              autoFocus
            />


            <div className="modal-actions">

              <button
                className="modal-button secondary"
                onClick={
                  cancelRename
                }
              >
                Cancel
              </button>


              <button
                className="modal-button primary"
                onClick={
                  saveRename
                }
                disabled={
                  !editingTitle.trim()
                }
              >
                Save
              </button>

            </div>

          </div>

        </div>

      )}


      {deletingConversation && (

        <div className="modal-backdrop">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>
                  Delete conversation?
                </h2>

                <p>
                  This will permanently delete
                  this conversation and its messages.
                </p>
              </div>

            </div>


            <div className="delete-preview">

              <span>
                {
                  deletingConversation.title
                }
              </span>

            </div>


            <div className="modal-actions">

              <button
                className="modal-button secondary"
                onClick={() =>
                  setDeletingConversation(
                    null
                  )
                }
              >
                Cancel
              </button>


              <button
                className="modal-button danger"
                onClick={
                  confirmDelete
                }
              >
                <Trash2 size={14} />

                Delete

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


export default ProductShell;