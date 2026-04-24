export const previewCommentStyles = `
  .preview-comment-outline {
    position: absolute;
    inset: 0;
    z-index: 999;
    border: 2px solid #dc2626;
    border-radius: 4px;
    pointer-events: none;
  }
  .preview-comment-icon {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 999;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: #dc2626;
    border-radius: 4px;
    width: 22px;
    height: 22px;
    font-size: 13px;
    font-weight: 700;
    font-family: Arial, sans-serif;
    line-height: 1;
    padding: 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
  }
  .preview-has-comment {
    position: relative;
  }
`;

export function getPreviewCommentHtml(comment: string | undefined): string {
  if (!comment || !comment.trim()) return "";
  
  const escapedComment = comment
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  return `
    <span class="preview-comment-outline" aria-hidden="true"></span>
    <span class="preview-comment-icon" title="${escapedComment}" aria-label="Commentaire">i</span>
  `;
}
