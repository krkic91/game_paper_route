# Xác minh kết nối Caro online — 29/10/2026

## Kết luận

**Chưa tái hiện được lỗi kết nối trong các tình huống đã kiểm tra.** Server/client
giữ đúng phòng, ghế, lượt và bàn cờ giữa Microsoft Edge và Google Chrome.
Không thay đổi mã sản phẩm khi chưa có bằng chứng lỗi. Đã bổ sung năm test cho
timeout/reconnect/endpoint và khả năng kiểm thử hai tiến trình trình duyệt riêng.

**Đã xác minh Caro online trong môi trường local:** 21/21 test online, luồng hai
trình duyệt và `npm run check` đạt. Toàn bộ **410/410 test** trên bản cuối đạt với
`npm test -- --test-concurrency=1 --test-timeout=250000`, không bỏ qua test.
Lượt `npm test` cuối với cấu hình mặc định bị timeout ở ngưỡng 360 giây; kết quả
đó vẫn là **unresolved**, không được thay bằng kết quả chạy tuần tự.

## Phạm vi và môi trường

- Theo `plan.md` đã được người dùng duyệt. Tối đa 3 vòng sửa, 30 phút chạy kiểm thử;
  các lượt chạy, kể cả phiên thủ công bị gián đoạn, được cộng trong `runs.json`.
- Sources đã đọc: `README.md`, `docs/caro-online.md`, `server/caro-online.cjs`,
  tests online; đọc thêm client/UI/loader và script HTTP để hiểu luồng kết nối.
- Windows; Node **24.21.0**, npm **10.8.3**, Playwright **1.64.0**, ws **8.22.0**.
- Trình duyệt A: **Microsoft Edge 156.0.4314.50**; B: **Google Chrome 156.0.8078.48**.
  Hai executable, hai tiến trình và hai browser context với storage riêng.
  Cả hai cùng nền Chromium, không phải kiểm tra chéo Chromium/WebKit.
- Backend thật `scripts/serve.js`, WebSocket `/ws/caro`, chỉ bind `127.0.0.1`,
  cổng do hệ điều hành cấp. Không dùng server tĩnh hoặc `file://` cho chơi online.
- Browser regression: A 1280 × 900; B 390 × 844, DPR 2, cảm ứng mô phỏng;
  có kiểm tra chuyển 2D/3D giữ phiên. Phiên quan sát từng bước: cả hai 1280 × 960.
- Không mở cổng 4173, triển khai Internet, cài dependency hay sửa cấu hình máy.

## Những gì thay đổi

| File | Thay đổi |
| --- | --- |
| `tests/online-client.test.cjs` | Thêm đồng hồ điều khiển trong fixture và 5 test: hết hạn kết nối ban đầu; mất ACK của nước đi; reconnect thất bại rồi hồi phục; phiên bị thay thế; kiểm tra file/HTTP/HTTPS/WS/WSS. |
| `tests/browser-online.cjs` | Cho phép `PEER_BROWSER_PATH` để người chơi B chạy bằng trình duyệt riêng; lưu phiên bản và kết quả JSON. Giữ cách chạy một engine cũ khi không đặt biến này. |
| `tests/browser-online-pair.cjs` | Chạy luồng online hiện có bằng Edge + Chrome và backend tạm có cleanup. |
| `tests/helpers/caro-browser-server.cjs` | Sở hữu PID/cổng backend, ghi log khởi động, đóng backend và xác minh cổng đóng. |
| `tests/caro-harness.cjs` | Chạy các CHECKS có timeout, ledger thời gian và log theo nhãn; không ghi đè bằng chứng đã có. |
| `tests/caro-manual.cjs` | Cầu nối thao tác từng bước do người điều khiển lựa chọn; lưu ảnh, trạng thái đã bỏ token, nhật ký và cleanup; tự dừng khi hết thời gian. |
| `plan.md`, `checks.md`, `progress.md`, `CLAUDE.md` | Ghi phê duyệt, kết quả, ngân sách và các quy tắc có thể tái sử dụng. |

Không sửa `server/`, client/game, `assets/`, `index.html` hoặc package cho task Caro.
Các thay đổi 3D có sẵn trước task được giữ nguyên.

## Kết quả CHECKS

Mọi đường dẫn bằng chứng bên dưới tương đối với thư mục dự án.

| Check | Verdict | Bằng chứng |
| --- | --- | --- |
| Baseline `npm test` | pass — 405/405 | `test-results/caro-online-verification/baseline-test.log`, exit 0, 163.558 giây. |
| Unit online sau bổ sung | pass — 21/21 | `extended-online.log`, exit 0, 5.152 giây. |
| `npm test` trên bản cuối | unresolved — timeout | `final-test.log`, ngưỡng 360 giây, tổng gồm cleanup 361.604 giây; runner exit 124. Không có tổng kết toàn suite. |
| `npm run lint` nếu có | Không áp dụng | `package.json` không có script lint; không báo lint đã chạy/pass. |
| `npm run check` trên bản cuối | pass | `final-syntax.log`, exit 0, 35.335 giây. |
| `npm test -- --test-concurrency=1 --test-timeout=250000` trên bản cuối | pass — 410/410 | `final-test-serial.log`, exit 0, 182.531 giây gồm wrapper; 0 fail/cancelled/skipped. Wrapper timeout 280 giây, không chạm giới hạn. |
| Hai trình duyệt tự động | pass | `baseline-browsers.log`, `baseline-browsers-browsers.json`, exit 0, 63.881 giây. |
| Kiểm tra hai phiên từng bước | pass trong môi trường mô tả | `manual-transcript.jsonl` và `manual-resume-transcript.jsonl`, ảnh tại hai thư mục cùng tên. |
| Đóng backend sau kiểm tra | pass | Ba file `baseline-browsers-cleanup.json`, `manual-cleanup.json`, `manual-resume-cleanup.json`: `serverExited=true`, `portClosed=true`. `final-cleanup.json`: không còn listener 4173/51400/51570/55987 hoặc tiến trình test/server của task. |

Các log trong bảng nằm dưới `test-results/caro-online-verification/`.
`npm.cmd` là cách gọi npm trên PowerShell. `npm run check` chỉ kiểm tra cú pháp,
không thay thế lint. Mã sản phẩm không đổi sau browser regression, nên kết quả
browser vẫn áp dụng cho bản cuối; test mới chỉ bổ sung tình huống client trong VM.

## Luồng tự động đã kiểm chứng

- A tạo phòng, B vào bằng link mời; mã được điền đúng, ghế/token riêng, người thứ
  ba bị từ chối. Cả hai sẵn sàng mới bắt đầu.
- So sánh bàn và round ở hai phía sau từng nước; chặn sai lượt và không xếp hàng
  nước đã bị từ chối. Sau reload giữ đúng ghế và số nước.
- Mất mạng ở B: A thấy đối thủ mất kết nối, bàn bị khóa. Trở lại mạng: cả hai
  connected, giữ nguyên bàn; không gửi lại nước cũ khi không rõ server đã nhận chưa.
- Kết thúc thắng, chỉ rematch khi cả hai đồng ý, đổi X/O đúng, phím P không làm
  đóng băng ván online. Đổi 2D/3D giữ nguyên session, round và game.
- Hủy xác nhận rời phòng giữ nguyên ván; xác nhận rời phòng tính bỏ cuộc đúng.
- Không có uncaught JavaScript pageerror trong lượt tự động hoặc các phiên tương tác.
- Unit tests kiểm tra timeout bằng đồng hồ điều khiển, resume lấy trạng thái server,
  socket cũ không ghi đè bàn mới, backoff, kết thúc phiên và WS/WSS. Server tests
  kiểm tra hết hạn giữ ghế, token sai, phòng đầy, Origin, request trùng, giới hạn tài nguyên.

## Kiểm tra thủ công qua công cụ điều khiển trình duyệt

Các thao tác được chọn từng bước, gửi qua Playwright đến hai trình duyệt headless,
rồi mở ảnh chụp để quan sát giao diện. Đây là kiểm tra tương tác và trực quan của
agent qua công cụ, không phải người dùng bấm chuột vật lý hoặc kiểm tra thiết bị thật.
Không đánh đồng riêng kết quả unit test hoặc kịch bản tự động với phần này.

| Bước quan sát | Kết quả | Ảnh / nhật ký |
| --- | --- | --- |
| Chọn online, nhập tên, A tạo phòng; B nhập mã và vào | Hai bên thấy cùng phòng và đúng X/O; chỉ A sẵn sàng thì chưa bắt đầu | `manual/08-create-A.png`, `manual/10-join-b-A.png`, `manual/10-join-b-B.png`; các bước 11–12 trong transcript. |
| Đánh lần lượt ô 112 và 113 | Cả hai hiển thị hai nước, đúng X/O và lượt tiếp theo | `manual/14-move-b-A.png`, `manual/14-move-b-B.png`. |
| Reload Chrome | Giữ phòng, người chơi O và hai quân; pending trở lại false | `manual/15-reload-b-B.png`. |
| Phiên tiếp tục: ngắt mạng Chrome | Edge báo giữ chỗ 90 giây; Chrome báo mất mạng, vẫn hiển thị bàn hai quân | `manual-resume/12-offline-b-A.png`, `manual-resume/12-offline-b-B.png`. |
| Bật mạng lại | Hai bên về connected, cùng version 8 và hai nước; thông báo mất mạng được xóa | `manual-resume/13-online-b-A.png`, `manual-resume/13-online-b-B.png`. |
| Đánh thêm hai nước và reload Edge | Cùng bốn quân, đúng lượt, không mất ghế | `manual-resume/15-move-b-A.png`, `manual-resume/16-reload-a-A.png` và transcript. |
| Chrome xác nhận rời; Edge rời sau đó | Edge thắng do đối thủ bỏ cuộc; Chrome về lobby; cuối cùng cả hai room=null, connection=idle | `manual-resume/17-leave-b-A.png`, `manual-resume/17-leave-b-B.png`, `manual-resume/19-quit-A.png`. |

Phiên manual đầu tự hết hạn 10 phút trong thời gian gián đoạn, đã đóng backend;
phiên `manual-resume` hoàn tất phần còn thiếu và thoát chủ động, exit 0.
Toàn bộ 603.429 giây của phiên đầu vẫn được tính vào ngân sách. Hai thao tác đầu
của phiên này gặp timeout locator / selector quá rộng; thao tác lại đúng selector
thành công, phiên tiếp tục không gặp lỗi đó. Chưa có bằng chứng đây là lỗi game.

Ảnh mất kết nối: [Edge](../test-results/caro-online-verification/manual-resume/12-offline-b-A.png),
[Chrome](../test-results/caro-online-verification/manual-resume/12-offline-b-B.png).
Ảnh phục hồi: [Edge](../test-results/caro-online-verification/manual-resume/13-online-b-A.png),
[Chrome](../test-results/caro-online-verification/manual-resume/13-online-b-B.png).

## Ngân sách và giới hạn kết luận

- Tổng 10 lượt: **1.674,947 giây / 1.800 giây** (27 phút 54,947 giây), còn
  125,053 giây. Chi tiết thời điểm, lệnh, exit code và thời lượng ở
  [runs.json](../test-results/caro-online-verification/runs.json).
- Số vòng sửa mã sản phẩm: **0/3** vì không tái hiện được lỗi cần sửa.
- Năm bài test mới kiểm tra khoảng trống của bộ kiểm thử và đều đạt trên mã hiện có;
  không có tuyên bố “đã sửa lỗi server” khi server chưa được thay đổi.
- Lượt `npm test` của task 2048 trước đây timeout không đủ để kết luận lỗi Caro.
  Khi chạy lại có kiểm soát, 405 bài đạt; tiến trình chạy lâu quan sát được là
  `tests/puppies.test.cjs` với việc đánh giá 500 đề. Không sửa game/test không liên quan.
- Lượt cuối mặc định timeout sau 360 giây dù các test online đã in kết quả đạt.
  Lượt chốt thay cấu hình chạy file test sang tuần tự để cô lập tải đồng thời;
  không loại bỏ test hoặc sửa Xếp cún để lấy pass. Toàn suite tuần tự đạt 410/410;
  chưa xác định chắc chắn nguyên nhân khiến cấu hình mặc định vượt timeout.
  Không có lỗi kết nối Caro được tái hiện. Không chạy thêm lượt trong lần bàn giao này.
- Chưa kiểm tra hai máy thật qua LAN/Internet, Safari/WebKit, proxy, TLS certificate
  hoặc firewall triển khai. Kết quả local không chứng minh các cấu hình đó.

## Chạy lại

Các lệnh dưới đây dùng để tái hiện ở một lượt kiểm thử sau, không phải các bước
còn đang chạy. Dùng nhãn mới để giữ bằng chứng; runner áp dụng ngân sách đã sử dụng
của harness này, không tự đặt lại 30 phút. Cần thống nhất ngân sách mới trước khi
chạy lại toàn bộ các CHECKS vì lần này chỉ còn 125,053 giây.

```powershell
node tests/caro-harness.cjs online rerun-online
node tests/caro-harness.cjs browser rerun-browsers
node tests/caro-harness.cjs test rerun-tests
node tests/caro-harness.cjs check rerun-syntax
```

Lệnh toàn suite đã đạt trên bản cuối là
`npm.cmd test -- --test-concurrency=1 --test-timeout=250000`.
Lượt này dùng wrapper giới hạn 280 giây, ghi stdout/stderr và cộng thời gian vào
ledger; khi chạy trực tiếp cũng cần tính vào ngân sách đã thống nhất.

Chạy riêng hai trình duyệt bằng `node tests/browser-online-pair.cjs`; helper tự mở
backend tạm và đóng trong `finally`. Đường dẫn Edge/Chrome hiện được đặt trong
`tests/helpers/caro-browser-server.cjs`. Không cần chạy `npm start` trước.

Muốn kiểm tra từng bước: đặt `CARO_MANUAL_LABEL` mới rồi chạy `node tests/caro-manual.cjs`;
gửi mỗi hành động JSON trên một dòng vào `<nhãn>-commands.jsonl`. Kết thúc bằng
`{"id":"quit","action":"quit"}`. Trình điều khiển có timeout và tính thời gian thực.

Handoff: [plan](../plan.md), [checks](../checks.md), [progress](../progress.md),
[CLAUDE](../CLAUDE.md). Bằng chứng được giữ trong `test-results/` (Git ignore);
giữ thư mục này nếu cần kiểm tra lại log và ảnh trên máy khác.
Diff quy tắc của lượt Caro: [CLAUDE-caro.diff](../test-results/caro-online-verification/CLAUDE-caro.diff).
Mẫu harness tái sử dụng là `harness.xml` hiện có, không cần tạo bản trùng.

## Checklist bàn giao

- OUTPUT và các file plan/checks/progress/CLAUDE đã cập nhật theo kết quả cuối.
- Mọi CHECK có verdict và bằng chứng; timeout `npm test` mặc định được giữ rõ là
  `unresolved`, còn toàn suite chạy tuần tự đạt trên cùng bản code cuối.
- Kiểm tra hai phiên có ảnh và nhật ký thao tác; giới hạn headless/local được nêu rõ.
- Chỉ bổ sung tests/công cụ kiểm thử và tài liệu cho task này; giữ nguyên mã sản phẩm
  và các thay đổi có sẵn. Không cần tạo hay sửa `AGENTS.md`.
- Đã đóng backend tạm và xác minh không còn tiến trình của task:
  [final-cleanup.json](../test-results/caro-online-verification/final-cleanup.json).
