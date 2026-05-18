import { MessagesView } from '../components/TopBar';

export default function ChatScreen() {
  return (
    <div style={{ padding: '20px 18px 130px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <MessagesView embedded />
    </div>
  );
}
