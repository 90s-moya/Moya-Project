#!/bin/bash

notify_mattermost() {
  local type="$1"       # build or deploy
  local status="$2"     # success or fail
  local env="$3"        # dev or prod
  local error_msg="${4:-""}"

  local emoji=":white_check_mark:"
  local title=""

  if [[ "$type" == "build" ]]; then
    if [[ "$status" == "fail" ]]; then
      title="*백엔드 빌드 실패*"
      emoji=":x:"
    else
      return 0  # 빌드는 성공해도 알림 안 보냄
    fi
  else
    if [[ "$status" == "fail" ]]; then
      emoji=":x:"
      title="*백엔드 ${env}서버 배포 실패*"
    else
      title="*백엔드 ${env}서버 배포 완료*"
    fi
  fi

  curl -X POST -H 'Content-Type: application/json' -d "{
    \"username\": \"🚀 Moya CI/CD Bot\",
    \"text\": \"${emoji} ${title}\nbranch: \`$CI_COMMIT_BRANCH\`\ncommitter: *$GITLAB_USER_NAME*\ncommit message: $CI_COMMIT_MESSAGE${error_msg:+\nerror: $error_msg}\"
  }" $MATTERMOST_WEBHOOK
}
