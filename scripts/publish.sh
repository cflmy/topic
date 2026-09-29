#!/usr/bin/env bash
# 构建 dist/ 并强制推送到 remote 的 public 分支（仅静态产物，orphan 历史）。
#
#   ./scripts/publish.sh
#   PUBLISH_REMOTE=origin PUBLISH_BRANCH=public ./scripts/publish.sh
#
# 服务器部署可：git clone --branch public --single-branch <url> 或拉取后以 public 为文档根。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="${PUBLISH_REMOTE:-origin}"
BRANCH="${PUBLISH_BRANCH:-public}"

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "error: remote '$REMOTE' 不存在" >&2
  exit 1
fi

REMOTE_URL="$(git remote get-url "$REMOTE")"

echo "==> 构建 dist/ ..."
python3 "$ROOT/scripts/build.py"

if [[ ! -f "$ROOT/dist/index.html" ]]; then
  echo "error: dist/index.html 未生成" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "==> 准备 $BRANCH 分支（orphan）..."
git -C "$TMP" init -q -b "$BRANCH"
# 继承本仓库作者信息（不修改 git config）
AUTHOR_NAME="$(git -C "$ROOT" log -1 --format='%an' 2>/dev/null || true)"
AUTHOR_EMAIL="$(git -C "$ROOT" log -1 --format='%ae' 2>/dev/null || true)"
if [[ -z "${AUTHOR_NAME}" ]]; then
  AUTHOR_NAME="$(git -C "$ROOT" config user.name 2>/dev/null || echo topic-publish)"
fi
if [[ -z "${AUTHOR_EMAIL}" ]]; then
  AUTHOR_EMAIL="$(git -C "$ROOT" config user.email 2>/dev/null || echo topic-publish@localhost)"
fi
export GIT_AUTHOR_NAME="$AUTHOR_NAME"
export GIT_AUTHOR_EMAIL="$AUTHOR_EMAIL"
export GIT_COMMITTER_NAME="$AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$AUTHOR_EMAIL"

cp -a "$ROOT/dist/." "$TMP/"
# 便于部分静态托管忽略 Jekyll 处理
touch "$TMP/.nojekyll"
printf '%s\n' "# topic static publish" "Built: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$TMP/PUBLISH.txt"

git -C "$TMP" add -A
if git -C "$TMP" diff --cached --quiet; then
  echo "error: 无文件可提交" >&2
  exit 1
fi

MSG="Publish static site $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git -C "$TMP" commit -q -m "$MSG"

echo "==> 推送到 $REMOTE_URL ($BRANCH) ..."
git -C "$TMP" remote add origin "$REMOTE_URL"
git -C "$TMP" push -f origin "HEAD:$BRANCH"

echo "==> 已推送 $BRANCH：$REMOTE_URL"
echo "    部署：git fetch && git checkout $BRANCH && 以仓库根为 Nginx root"
