import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Text } from '@tabby.ai/tabby-ui/O25/Text';
import ArrowBack24 from '@tabby.ai/tabby-ui/icons/core/ArrowBack24';
import Attachment24 from '@tabby.ai/tabby-ui/icons/core/Attachment24';
import CheckDouble16 from '@tabby.ai/tabby-ui/icons/core/CheckDouble16';
import Play24 from '@tabby.ai/tabby-ui/icons/core/Play24';
import Chatbot24 from '@tabby.ai/tabby-ui/icons/core/Chatbot24';
import Agent24 from '@tabby.ai/tabby-ui/icons/core/Agent24';
import { usePhoneCanvas } from '../../lib/usePhoneCanvas';
import { toCaveman } from './caveman';
import styles from './Chat.module.css';

// NO tabby-ui equivalent — bubble/system/typing/input primitives hand-rolled with tokens.

type AvatarKind = 'bot' | 'agent';

type Message =
  | {
      kind: 'in';
      sender: AvatarKind;
      senderName: string;
      body: string;
      timestamp: string;
    }
  | {
      kind: 'out';
      body: string;
      timestamp: string;
      showAttachments?: boolean;
    }
  | { kind: 'system'; body: string };

const SEED: Message[] = [
  {
    kind: 'in',
    sender: 'bot',
    senderName: 'Tabby ChatBot',
    body: 'Select a topic you need help with',
    timestamp: '1:32 am',
  },
  { kind: 'out', body: 'Fix an incorrect charge', timestamp: '1:32 am' },
  { kind: 'out', body: 'I want to talk to human', timestamp: '1:32 am' },
  { kind: 'system', body: 'Ahmad joined the conversation' },
  {
    kind: 'in',
    sender: 'agent',
    senderName: 'Ahmad',
    body: 'Hey Yasser! Thank you for reaching us out! What do you want?',
    timestamp: '1:32 am',
  },
  {
    kind: 'out',
    body: "These rings don't fit any of my fingers. I want a refund!",
    timestamp: '1:32 am',
    showAttachments: true,
  },
  {
    kind: 'in',
    sender: 'agent',
    senderName: 'Ahmad',
    body: 'Wtf',
    timestamp: '1:32 am',
  },
];

function Avatar({ kind }: { kind: AvatarKind }) {
  return (
    <div className={styles.avatar}>
      {kind === 'bot' ? <Chatbot24 /> : <Agent24 />}
    </div>
  );
}

function InboundBubble({
  sender,
  avatarKind,
  timestamp,
  children,
}: {
  sender: string;
  avatarKind: AvatarKind;
  timestamp: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.inboundRow}>
      <Avatar kind={avatarKind} />
      <div className={styles.inboundBubble}>
        <Text variant="caption" className={styles.sender}>{sender}</Text>
        <div className={styles.bubbleBody}>
          <Text variant="body2Tight" className={styles.bodyText}>{children}</Text>
          <Text variant="microtext" className={styles.inboundTimestamp}>{timestamp}</Text>
        </div>
      </div>
    </div>
  );
}

function OutgoingBubble({
  timestamp,
  attachments,
  children,
}: {
  timestamp: string;
  attachments?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.outgoingRow}>
      <div className={styles.outgoingBubble}>
        {attachments}
        <div className={styles.bubbleBody}>
          <Text variant="body2Tight" className={styles.bodyText}>{children}</Text>
          <span className={styles.outgoingTimestamp}>
            <CheckDouble16 size={12} />
            <Text variant="microtext">{timestamp}</Text>
          </span>
        </div>
      </div>
    </div>
  );
}

function SystemMessage({ children }: { children: ReactNode }) {
  return (
    <div className={styles.systemRow}>
      <Text variant="caption" className={styles.systemText}>{children}</Text>
    </div>
  );
}

function AttachmentGrid() {
  return (
    <div className={styles.attachments}>
      <div className={`${styles.mediaTile} ${styles.mediaTall}`}>
        <div className={styles.mediaArt} aria-hidden>
          <div className={styles.ringGlow} />
        </div>
        <div className={styles.playOverlay}>
          <Play24 size={14} />
          <Text variant="microtext" className={styles.playLabel}>0:26</Text>
        </div>
      </div>
      <div className={styles.pdfTile}>
        <Text variant="captionBold" className={styles.pdfLabel}>PDF</Text>
        <Text variant="body2Tight" className={styles.pdfFilename}>
          Receipt with the looooong name
        </Text>
      </div>
      <div className={styles.mediaTile}>
        <div className={styles.mediaArt} aria-hidden>
          <div className={`${styles.ringGlow} ${styles.ringGlowSmall}`} />
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className={styles.typing} aria-live="polite">
      <Text variant="caption" className={styles.typingText}>
        Ahmad is typing <span className={styles.typingDots}>...</span>
      </Text>
    </div>
  );
}

function nowTimestamp() {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export default function Chat() {
  usePhoneCanvas('var(--tui-background-general-level-1)');

  const [messages, setMessages] = useState<Message[]>(SEED);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replyTimer = useRef<number | null>(null);

  // Keep thread scrolled to latest message any time messages or typing change.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  // Clear pending reply timer on unmount
  useEffect(() => {
    return () => {
      if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
    };
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const outgoing: Message = {
      kind: 'out',
      body: text,
      timestamp: nowTimestamp(),
    };
    setMessages((prev) => [...prev, outgoing]);
    setInput('');
    setTyping(true);
    inputRef.current?.focus();

    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
    const thinkDelay = 900 + Math.min(text.length * 35, 1800);
    replyTimer.current = window.setTimeout(() => {
      const reply: Message = {
        kind: 'in',
        sender: 'agent',
        senderName: 'Ahmad',
        body: toCaveman(text),
        timestamp: nowTimestamp(),
      };
      setMessages((prev) => [...prev, reply]);
      setTyping(false);
      replyTimer.current = null;
    }, thinkDelay);
  }, [input]);

  return (
    <div className={styles.screen}>
      <header className={styles.nav}>
        <button type="button" className={styles.navBack} aria-label="Back">
          <ArrowBack24 />
        </button>
        <Text variant="body1TightBold" className={styles.navTitle}>Tabby Chat</Text>
        <div className={styles.navSpacer} aria-hidden />
      </header>

      <div className={styles.thread} ref={threadRef}>
        {messages.map((m, i) => {
          if (m.kind === 'system') {
            return <SystemMessage key={i}>{m.body}</SystemMessage>;
          }
          if (m.kind === 'in') {
            return (
              <InboundBubble
                key={i}
                sender={m.senderName}
                avatarKind={m.sender}
                timestamp={m.timestamp}
              >
                {m.body}
              </InboundBubble>
            );
          }
          return (
            <OutgoingBubble
              key={i}
              timestamp={m.timestamp}
              attachments={m.showAttachments ? <AttachmentGrid /> : undefined}
            >
              {m.body}
            </OutgoingBubble>
          );
        })}

        {typing && <TypingIndicator />}
      </div>

      <form
        className={styles.inputBar}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <button type="button" className={styles.attachBtn} aria-label="Attach">
          <Attachment24 />
        </button>
        <input
          ref={inputRef}
          type="text"
          className={styles.textInput}
          placeholder="Type message here"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
        />
      </form>
    </div>
  );
}
