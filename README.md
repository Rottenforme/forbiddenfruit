# 선악과 한 입

엘렉시온과 데모고르곤, 두 사람만 로그인해서 대화를 이어가는 사이트입니다.
랜딩 페이지 없이 `index.html` 하나로 되어 있고, 계정은 미리 콘솔에서 만들어둡니다.

## 1. Firebase 프로젝트 준비

1. https://console.firebase.google.com 에서 새 프로젝트 생성
2. **Authentication** → 시작하기 → 로그인 방법에서 **이메일/비밀번호** 활성화
3. **Authentication > Users** 탭에서 계정 2개 추가
   - `elexion@user.local` — 엘렉시온용 비밀번호
   - `demogorgon@user.local` — 데모고르곤용 비밀번호
   (이 두 이메일 주소는 `app.js`의 `ACCOUNTS`에 고정되어 있어서 정확히 이 철자로 만들어야 합니다.)
4. **Firestore Database** → 데이터베이스 만들기 (프로덕션 모드)
5. **Firestore > 규칙** 탭에 아래 규칙을 붙여넣고 게시

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{who} {
      allow read: if true;
      allow write: if request.auth != null && (
        (who == 'elexion' && request.auth.token.email == 'elexion@user.local') ||
        (who == 'demogorgon' && request.auth.token.email == 'demogorgon@user.local')
      );
    }

    match /site/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /messages/{id} {
      allow read: if true;
      allow create: if request.auth != null && (
        (request.resource.data.senderId == 'elexion' && request.auth.token.email == 'elexion@user.local') ||
        (request.resource.data.senderId == 'demogorgon' && request.auth.token.email == 'demogorgon@user.local')
      );
      allow update, delete: if request.auth != null && (
        (resource.data.senderId == 'elexion' && request.auth.token.email == 'elexion@user.local') ||
        (resource.data.senderId == 'demogorgon' && request.auth.token.email == 'demogorgon@user.local')
      );
    }
  }
}
```

6. **프로젝트 설정(톱니바퀴) > 일반 > 내 앱**에서 나오는 설정값을 `firebase-config.js`에 붙여넣기

## 2. 파일 구성

- `index.html` + `app.js`: 사이트 전체 (로그인 전/후 화면 전환 포함)
- `style.css`: 스타일
- `firebase-config.js`: Firebase 프로젝트 설정값
- `elexion_logo.png` / `demogorgon_logo.png`: 상단 로고 (검+뱀 = 엘렉시온, 총+심장 = 데모고르곤)

## 3. 화면 동작

- **로그아웃 상태**: 상단에 두 로고 다 표시, 프로필 자리엔 "선악과" 텍스트만. 메시지 입력 불가(읽기만 가능)
- **엘렉시온으로 로그인**: 상단엔 엘렉시온 로고만, 프로필 자리엔 **데모고르곤**의 닉네임/상태/사진 표시 (실제 메신저에서 상대방 정보가 뜨는 것처럼)
- **데모고르곤으로 로그인**: 반대로 데모고르곤 로고 + 엘렉시온 프로필
- 메시지는 보낸 사람 기준으로 항상 같은 자리에 정렬(엘렉시온 = 오른쪽, 데모고르곤 = 왼쪽)되고, 말풍선 색은 각자 설정한 색을 그대로 씀
- 각자 로그인해서 메뉴 > **프로필 설정**에서 자기 것만 관리: 닉네임, 색상, 프로필 사진, 표정 이미지, 상태+한마디+위치, 배경화면(나한테만 보임), 시간 표시 on/off
- 같은 프로필 설정 화면 안에 **공용 장식** 항목이 있어서, 로그인한 사람이면 누구든 추가/삭제 가능 (두 사람이 같이 쓰는 여백 스티커)
- 메뉴 > **장식 위치 조정**은 로그인 상태면 누구나 들어가서 공용 장식들을 드래그/리사이즈/순서 조정 가능

## 4. 아직 안 된 것

- 예전 익명함 사이트에 있던 "링크 복사" 기능은 이 사이트엔 안 넣었습니다 (필요하면 말씀해주세요)
- 이미지 첨부(사진/표정)는 Storage 없이 Firestore에 축소 저장하는 방식이라 무료 플랜 그대로 사용 가능

## 5. 배포 (GitHub Pages)

1. 이 폴더 전체를 새 GitHub 저장소에 업로드
2. 저장소 Settings > Pages > Branch를 main으로 설정
3. `https://아이디.github.io/저장소이름/` 으로 접속
