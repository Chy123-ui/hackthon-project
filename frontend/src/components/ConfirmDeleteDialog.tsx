interface Props {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteDialog({ onCancel, onConfirm }: Props) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>确定删除？</h3>
        <p>
          此操作不可撤销。对话会话及所有消息将被永久删除。
        </p>
        <div className="confirm-actions">
          <button className="secondary" onClick={onCancel}>
            取消
          </button>
          <button className="danger" onClick={onConfirm}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
