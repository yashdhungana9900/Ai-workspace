import {
  ArrowUp,
  ChevronDown,
  FileText,
  Image,
  Paperclip,
  Plus,
  Sparkles,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getDocuments,
  uploadDocument,
} from "../../api";


function ChatWorkspace({
  accessToken,
  conversation,
  messages,
  input,
  setInput,
  onSendMessage,
  isSending,
  onNewConversation,
}) {
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [isProcessingDocument, setIsProcessingDocument] =
    useState(false);

  const [processingDocumentId, setProcessingDocumentId] =
    useState(null);

  const [processingDocumentName, setProcessingDocumentName] =
    useState("");

  const [uploadError, setUploadError] =
    useState("");

  const [uploadSuccess, setUploadSuccess] =
    useState("");


  const suggestions = [
    {
      icon: FileText,
      title: "Analyze a document",
      description:
        "Summarize, extract insights, or answer questions.",
      prompt:
        "Help me analyze this document.",
    },
    {
      icon: Sparkles,
      title: "Build something",
      description:
        "Plan architecture, write code, or debug a problem.",
      prompt:
        "Help me design and build a software project.",
    },
    {
      icon: Image,
      title: "Understand an image",
      description:
        "Analyze screenshots, diagrams, or visual content.",
      prompt:
        "Help me understand this image.",
    },
    {
      icon: SlidersHorizontal,
      title: "Explore an idea",
      description:
        "Research concepts and turn them into clear plans.",
      prompt:
        "Help me explore this idea.",
    },
  ];


  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (
        !isSending &&
        !isUploading &&
        !isProcessingDocument &&
        input.trim()
      ) {
        onSendMessage();
      }
    }
  };


  const handleAttachClick = () => {
    if (
      isUploading ||
      isProcessingDocument
    ) {
      return;
    }

    setUploadError("");
    setUploadSuccess("");

    fileInputRef.current?.click();
  };


  const handleFileChange = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    console.log(
      "File selected:",
      file.name,
      file.type,
      file.size
    );

    setUploadError("");
    setUploadSuccess("");
    setSelectedFile(file);
  };


  /*
   * Poll Celery document processing status.
   *
   * The upload API returns quickly after the
   * Document is created and the Celery task is queued.
   *
   * We then check GET /documents/ every 2 seconds
   * until the document becomes READY or FAILED.
   */
  useEffect(() => {
    if (
      !accessToken ||
      !processingDocumentId
    ) {
      return;
    }

    let cancelled = false;

    const checkDocumentStatus = async () => {
      try {
        const documents =
          await getDocuments(
            accessToken
          );

        if (cancelled) {
          return;
        }

        const document =
          documents.find(
            (item) =>
              String(item.id) ===
              String(processingDocumentId)
          );

        if (!document) {
          return;
        }

        console.log(
          "Document processing status:",
          document.status
        );

        if (
          document.status === "ready"
        ) {
          setIsProcessingDocument(false);
          setProcessingDocumentId(null);

          setUploadSuccess(
            `${processingDocumentName || document.name} is ready.`
          );

          return;
        }

        if (
          document.status === "failed"
        ) {
          setIsProcessingDocument(false);
          setProcessingDocumentId(null);

          setUploadError(
            document.error_message ||
              "Document processing failed."
          );

          setUploadSuccess("");

          return;
        }
      } catch (error) {
        console.error(
          "DOCUMENT STATUS ERROR:",
          error
        );
      }
    };


    checkDocumentStatus();

    const intervalId =
      setInterval(
        checkDocumentStatus,
        2000
      );

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    accessToken,
    processingDocumentId,
    processingDocumentName,
  ]);


  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    if (!accessToken) {
      setUploadError(
        "You are not authenticated. Please log in again."
      );

      return;
    }

    setUploadError("");
    setUploadSuccess("");
    setIsUploading(true);

    console.log(
      "Starting document upload:",
      selectedFile.name
    );

    try {
      const result =
        await uploadDocument(
          accessToken,
          selectedFile
        );

      console.log(
        "Document uploaded successfully:",
        result
      );

      /*
       * The API now queues the Celery task.
       * Processing continues in the background.
       */
      setProcessingDocumentId(
        result.id
      );

      setProcessingDocumentName(
        result.name ||
          selectedFile.name
      );

      setIsProcessingDocument(true);

      setUploadSuccess(
        `${selectedFile.name} uploaded. Processing started...`
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      console.error(
        "Document upload failed:",
        error
      );

      setUploadError(
        error?.message ||
          "Failed to upload document."
      );

    } finally {
      setIsUploading(false);
    }
  };


  const handleCancelUpload = () => {
    if (isProcessingDocument) {
      return;
    }

    setSelectedFile(null);
    setUploadError("");
    setUploadSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  useEffect(() => {
    if (!messagesEndRef.current) {
      return;
    }

    messagesEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);


  const hasMessages =
    messages.length > 0;


  const documentBusy =
    isUploading ||
    isProcessingDocument;


  return (
    <section className="chat-workspace">

      <header className="chat-header">

        <div className="chat-header-left">

          <button
            className="chat-title-button"
            type="button"
          >

            <div className="chat-title-icon">
              <Sparkles
                size={15}
                strokeWidth={2.1}
              />
            </div>

            <div className="chat-title-copy">

              <span className="chat-title">
                {conversation?.title ||
                  "New conversation"}
              </span>

              <span className="chat-subtitle">
                Personal workspace
              </span>

            </div>

            <ChevronDown size={15} />

          </button>

        </div>


        <div className="chat-header-right">

          <button
            className="header-icon-button"
            aria-label="New conversation"
            onClick={onNewConversation}
            type="button"
          >
            <Plus size={18} />
          </button>


          <button
            className="model-selector"
            type="button"
          >
            <span className="model-dot" />

            <span>
              Ollama · llama3.2:3b
            </span>

            <ChevronDown size={14} />
          </button>

        </div>

      </header>


      <div className="chat-content">

        {!hasMessages ? (

          <div className="chat-empty-state">

            <div className="hero-mark">
              <Sparkles
                size={22}
                strokeWidth={2}
              />
            </div>


            <div className="hero-copy">

              <h1>
                What can I help you build?
              </h1>

              <p>
                Ask a question, analyze a document,
                write code, or start something new.
              </p>

            </div>


            <div className="suggestion-grid">

              {suggestions.map(
                (suggestion) => {
                  const Icon =
                    suggestion.icon;

                  return (
                    <button
                      className="suggestion-card"
                      key={suggestion.title}
                      onClick={() =>
                        setInput(
                          suggestion.prompt
                        )
                      }
                      type="button"
                    >

                      <div className="suggestion-icon">

                        <Icon
                          size={17}
                          strokeWidth={1.8}
                        />

                      </div>


                      <div className="suggestion-copy">

                        <span className="suggestion-title">
                          {suggestion.title}
                        </span>

                        <span className="suggestion-description">
                          {suggestion.description}
                        </span>

                      </div>

                    </button>
                  );
                }
              )}

            </div>

          </div>

        ) : (

          <div className="message-list">

            {messages.map((message) => {

              const isStreaming =
                typeof message.id ===
                  "string" &&
                message.id.startsWith(
                  "streaming-"
                );

              const sources =
                message.role === "assistant" &&
                Array.isArray(message.sources)
                  ? message.sources
                  : [];

              return (
                <div
                  className={`message-row ${
                    message.role
                  } ${
                    isStreaming
                      ? "streaming"
                      : ""
                  }`}
                  key={message.id}
                >

                  <div className="message-avatar">

                    {message.role ===
                    "assistant" ? (
                      <Sparkles size={15} />
                    ) : (
                      "Y"
                    )}

                  </div>


                  <div className="message-body">

                    <div className="message-author">

                      {message.role ===
                      "assistant"
                        ? "AI Workspace"
                        : "You"}

                    </div>


                    <div className="message-content">
                      {message.content}
                    </div>


                    {sources.length > 0 && (
                      <div className="message-sources">

                        <div className="message-sources-header">
                          <FileText size={14} />

                          <span>
                            Sources
                          </span>
                        </div>


                        <div className="message-sources-list">

                          {sources.map(
                            (source, index) => (
                              <div
                                className="message-source"
                                key={`${source.document}-${source.chunk}-${index}`}
                              >

                                <div className="message-source-icon">
                                  <FileText
                                    size={14}
                                  />
                                </div>


                                <div className="message-source-copy">

                                  <span className="message-source-document">
                                    {source.document}
                                  </span>

                                  <span className="message-source-meta">
                                    Chunk {source.chunk}
                                    {" · "}
                                    Relevance{" "}
                                    {(
                                      (1 -
                                        Number(
                                          source.distance
                                        )) *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </span>

                                </div>

                              </div>
                            )
                          )}

                        </div>

                      </div>
                    )}

                  </div>

                </div>
              );
            })}


            <div
              ref={messagesEndRef}
              className="messages-end"
              aria-hidden="true"
            />

          </div>

        )}

      </div>


      <div className="composer-area">

        {selectedFile && (
          <div className="upload-preview">

            <div className="upload-preview-info">

              <FileText size={18} />

              <div>

                <strong>
                  {selectedFile.name}
                </strong>

                <span>
                  {(
                    selectedFile.size /
                    1024
                  ).toFixed(1)} KB
                </span>

              </div>

            </div>


            {!isUploading &&
              !isProcessingDocument && (
              <button
                type="button"
                className="upload-cancel"
                onClick={
                  handleCancelUpload
                }
                aria-label="Remove selected file"
              >
                <X size={16} />
              </button>
            )}

          </div>
        )}


        {uploadError && (
          <div className="upload-error">
            {uploadError}
          </div>
        )}


        {uploadSuccess && (
          <div className="upload-success">
            {uploadSuccess}
          </div>
        )}


        {selectedFile &&
          !isUploading &&
          !isProcessingDocument && (
          <button
            type="button"
            className="upload-document-button"
            onClick={handleUpload}
          >
            <Upload size={16} />

            Upload document
          </button>
        )}


        {isUploading && (
          <div className="upload-status">
            Uploading document...
          </div>
        )}


        {isProcessingDocument && (
          <div className="upload-status">
            Processing{" "}
            {processingDocumentName
              ? `"${processingDocumentName}"`
              : "document"}
            {" "}· extracting text, creating
            chunks, and generating embeddings...
          </div>
        )}


        <div className="composer">

          <div className="composer-input-row">

            <button
              className="composer-icon"
              aria-label="Attach file"
              onClick={handleAttachClick}
              disabled={documentBusy}
              type="button"
            >
              <Paperclip size={18} />
            </button>


            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={handleFileChange}
              style={{
                display: "none",
              }}
            />


            <textarea
              className="composer-input"
              placeholder={
                documentBusy
                  ? "Processing document..."
                  : "Message AI Workspace..."
              }
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={
                isSending ||
                documentBusy
              }
            />


            <button
              className={`send-button ${
                !input.trim() ||
                isSending ||
                documentBusy
                  ? "disabled"
                  : ""
              }`}
              aria-label="Send message"
              onClick={onSendMessage}
              disabled={
                !input.trim() ||
                isSending ||
                documentBusy
              }
              type="button"
            >
              <ArrowUp
                size={18}
                strokeWidth={2.4}
              />
            </button>

          </div>


          <div className="composer-footer">

            <div className="composer-tools">

              <button
                className="composer-tool"
                onClick={handleAttachClick}
                disabled={documentBusy}
                type="button"
              >
                <Paperclip size={14} />

                {documentBusy
                  ? "Processing..."
                  : "Attach"}
              </button>


              <button
                className="composer-tool"
                type="button"
              >
                <Sparkles size={14} />

                Tools
              </button>

            </div>


            <span className="composer-hint">
              Enter to send · Shift + Enter
              for newline
            </span>

          </div>

        </div>


        <p className="composer-disclaimer">
          AI Workspace can make mistakes.
          Check important information.
        </p>

      </div>

    </section>
  );
}


export default ChatWorkspace;