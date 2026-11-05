# 전기지식 채널 쇼츠 디자인

전기기사단(빨강 강조)과 구분하기 위한 **전기지식 전용** 디자인.

컨셉: **모눈 노트** — 공부 노트처럼 정리해 주는 채널.

| 항목 | 전기기사단 | 전기지식 (이 폴더) |
|---|---|---|
| 배경 | 검정 + 크림 패널 | **남색 모눈 배경 + 흰 카드(왼쪽 노랑 띠, 둥근 모서리)** |
| 강조색 | 빨강 글씨 | **노랑** (남색 배경: 노랑 글씨 / 흰 카드: 노랑 형광펜) |
| 장면 표시 | 없음 | **번호 배지(1·2·3…) + 진행 점** |
| 자막 | 어두운 바 + 흰 글씨 | **노랑 기울임 바 + 검정 글씨** |
| 채널명 | 맨 아래 회색 글씨 | **맨 위 노랑 칩(⚡전기지식)** |
| 제목 글씨체 | Noto Sans KR | **Black Han Sans** |
| 본문·자막 글씨체 | Noto Sans KR | **Do Hyeon** |

## 만들기
```bash
node jisik.mjs example-water.json out/          # shorts.mp4 + thumbnail.png + scene1~N.png
node jisik.mjs spec.json out/ --audio voice.mp3 # 음성 길이에 맞춰 영상 늘림
node jisik.mjs spec.json out/ --font B          # 글씨체 바꿔 보기 (A 기본 / B Jua / C 도현+나눔고딕)
```
필요: Playwright(chromium), ffmpeg, 인터넷(Google Fonts).

## spec 형식
```json
{
  "top": ["전압 전류", "{y:물로 보면}"],
  "brand": "전기지식",
  "scenes": [ { "text": "전류는 실제로 흐르는\n{y:물의 양}이에요.", "sub": "전류 = 흐르는 {y:물의 양}" } ]
}
```
- `{y:글자}` = 노랑 강조. 예전 spec의 `**글자**`·`{r:글자}`도 자동으로 노랑이 된다.
- 장면 하나당 3.2초(`scene_gap`), 마지막 장면 3.5초(`last_hold`).
- 패널 글은 한 줄 11자 안팎, 4줄까지. 강조는 한 장면에 1~2군데만.
