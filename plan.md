# Plan — Kiểm tra và sửa game giao báo, game đua xe đạp

Trạng thái: **ĐÃ TRIỂN KHAI VÀ BÀN GIAO ĐỢT 1**; còn timeout `npm test` mặc định.
Ngày lập: 2026-10-29. Vòng sửa: **2/3**. Kiểm thử và cleanup cuối: **884,472/1.800 giây**.

Task đã duyệt là yêu cầu mới nhất: Delivery Dash (giao báo) và Đua xe đạp.
Hai đoạn Caro lặp trước đó không được chạy lại trong task này. Kế hoạch và kết quả
Caro/2048 được giữ nguyên ở phần lưu cuối file; ngân sách các task đó không bị đặt lại.
Người dùng đã phản hồi “ok bạn làm đi nhé” cho đợt đầu: nút ném trái/phải và
phản hồi mục tiêu giao báo; chỉ báo núp gió, cảnh báo đường và khoảng cách đối thủ
đua xe. Giữ CHECKS/OUTPUT/ngân sách dưới đây. Cải tiến là tính năng mới được duyệt,
không cần giả lập lỗi trước khi triển khai. Lỗi hồi quy vẫn cần bằng chứng tái hiện.

Phạm vi đã triển khai: `games/race-logic.js`, `games/race.js`, `games/race.css`,
`games/3d/delivery.js`, CSS liên quan và tests. Đã hỏi riêng quyền sửa thêm
`core.js`, `game.js`, `delivery.html`, `delivery.css` cho giao báo 2D; người dùng
đã phản hồi “tiếp tục” sau câu hỏi phạm vi, tiếp tục cả phần này. Dùng helper mới
`games/delivery-guide.js` nên không cần sửa core.js. Không thêm combo, tuyến mới
hoặc bóng thành tích ở đợt 1.

Check tính năng: ném đúng bên, trạng thái sẵn sàng/đang bay/ngoài tầm/hết báo;
cảnh báo lấy từ trackAt và dừng tại đích; khoảng cách không âm; núp gió bám đúng
trạng thái mô phỏng; giao diện đủ chỗ ở 320/390 px; pause/restart/cleanup và 2D/3D.

## 1. Đầu vào và phạm vi

| Mục | Nội dung |
| --- | --- |
| TASK | Kiểm tra hai game và triển khai cải tiến đợt 1 đã duyệt cho 2D/3D. |
| OUTPUT | `D:\1_Project\game_creator\docs\paper-route-verification.md` — một báo cáo có kết quả riêng cho từng game. |
| CHECKS | `npm test`; `npm run lint` nếu có. Bổ sung kiểm tra cú pháp và kiểm tra trình duyệt cho luồng bị ảnh hưởng. |
| SOURCES | `README.md`, `games/`, `tests/`; tham chiếu `docs/delivery-dash.md`, `docs/race.md` và mã gốc được README dẫn tới. |
| SCOPE mã | `tests/`, `games/`, `assets/` hoặc `index.html`; bổ sung `game.js`, `delivery.html`, `delivery.css` sau trao đổi phạm vi. Thay đổi chỉ phục vụ đợt 1 và sửa lỗi liên quan. |
| LIMIT | Tối đa 3 vòng sửa cho cả hai game cộng lại; tối đa 30 phút tổng thời lượng chạy kiểm thử, kể cả lượt fail/timeout và cleanup. |
| Tài liệu | `plan.md`, `checks.md`, `progress.md`, `CLAUDE.md`, OUTPUT và hướng dẫn hai game `docs/delivery-dash.md`, `docs/race.md`; log/ảnh/diff tại `test-results/paper-route-verification/`. |

Việc duyệt plan bao gồm cập nhật các tài liệu harness được `harness.xml` yêu cầu,
ngoài SCOPE mã. Giữ lịch sử Caro/2048 trong metadata, không ghi đè báo cáo hoặc log cũ.
Không sửa `server/`, package/lockfile, README hay cấu hình máy; không cài dependency,
commit, push hoặc triển khai. Không tạo/sửa `AGENTS.md`.

**Ranh giới sau trao đổi:** giao báo 2D dùng iframe và mã gốc, đã mở rộng ba tệp
giao diện/điều khiển nói trên. `core.js` và `arcade.js` vẫn giữ nguyên trong task này.
Helper `games/delivery-guide.js` chỉ mô tả trạng thái từ API core, không sao chép
hoặc thay luật. Không chèn vá vào `index.html` để né ranh giới.

## 2. Bối cảnh đã xác nhận khi lập plan

- Đã đọc `harness.xml`, skill `.agents/skills/harness/SKILL.md`, CLAUDE và trạng thái
  các lượt trước; không tìm thấy `AGENTS.md` áp dụng. Worktree có nhiều thay đổi
  3D và tests từ trước, cần bảo toàn và đối chiếu diff theo baseline hiện tại.
- Delivery Dash: 24 hộp thư, 36 tờ báo, 3 mạng; mỗi lần giao đúng +100 điểm;
  tới cuối tuyến 430 đơn vị khi còn mạng là thắng, không bắt buộc giao đủ 24 hộp.
- Đua xe đạp: 1 km, 3 đối thủ; hai renderer dùng `games/race-logic.js`.
  Xe tự đạp, có nước rút/phanh/thả trôi/núp gió; đổi 2D/3D bắt đầu ván mới.
- Tests sẵn có: `tests/core.test.js`, `tests/race.test.cjs`, phần race trong
  `tests/arcade.test.js`, `tests/lifecycle.test.js`, `tests/browser-race.cjs`,
  `tests/browser-race-scene.cjs`, các luồng delivery trong browser-smoke/browser-3d.
- `package.json` có `test` và `check`, chưa có `lint`. Kiểm tra lại khi thực thi;
  không coi `npm run check` là lint.
- Lượt Caro trước có toàn suite mặc định timeout nhưng 410/410 đạt khi chạy tuần tự.
  Đây là thông tin chọn timeout, không thay kết quả kiểm thử mới của task này.
- Lượt trước dùng Edge/Chrome hệ thống và Playwright đã cài; cần kiểm tra khả dụng
  khi thực thi. Chưa có bằng chứng lỗi của hai game trong lượt này.

## 3. Các bước sau phê duyệt

| Bước | File đọc | File ghi | Đầu ra quan sát được | Check hoàn thành | Song song |
| --- | --- | --- | --- | --- | --- |
| 1. Baseline | Plan, CLAUDE, progress/checks, package, Git diff; nguồn và tests hai game | Metadata, log; `tests/paper-route-harness.cjs` nếu cần runner đo giới hạn | Mốc diff, phiên bản công cụ, ledger riêng, kết quả trước sửa | Chạy tests mục tiêu; xác nhận lint; ghi lệnh/exit/thời lượng thực | Không; tránh tranh CPU và cộng trùng thời gian |
| 2. Tái hiện | `core.js`, `game.js`, `delivery.html`, `delivery.css` chỉ đọc; `games/3d/delivery.js`, `games/3d/action-views.js`, `games/race-logic.js`, `games/race.js`, `games/race-2d.js`, `games/race-audio.js`, `games/race.css`, `games/3d/race-view.js`, shared/loader liên quan | Tests hồi quy cần thiết; log, ảnh, checks/progress | Bước tái hiện và expected/actual cho mỗi lỗi hoặc bằng chứng luồng đạt | Kiểm tra các tình huống mục 4 bằng logic và trình duyệt | Các lượt đọc có thể độc lập; thực hiện một phiên, không dùng subagent |
| 3. Sửa có giới hạn | Bằng chứng fail và đoạn mã liên quan | Chỉ tệp trong SCOPE cần sửa; test bắt lỗi | Bản sửa nhỏ và nguyên nhân; đánh số vòng sửa | Test tái hiện fail trước sửa, pass sau sửa; không sửa khi chưa có lỗi | Không; tối đa 3 vòng tổng cộng |
| 4. Xác minh cuối | Diff cuối, tests mục tiêu, checklist | Log/ảnh và verdict cuối | Kết quả trên bản code cuối của cả hai game | `npm.cmd test`; lint nếu có; `npm.cmd run check`; tests mục tiêu và browser bị ảnh hưởng | Không; mỗi lệnh có timeout trong ngân sách còn lại |
| 5. Bàn giao | Ledger, log/ảnh, diff, kết quả | OUTPUT, plan/checks/progress/CLAUDE; diff CLAUDE trong thư mục bằng chứng | Báo cáo mở được, đủ bằng chứng, giới hạn và cách chạy lại | Mọi CHECK có verdict; phạm vi đúng; tài nguyên test đã đóng | Không |

## 4. Tiêu chí kiểm tra đặt trước

### Delivery Dash — giao báo

- Khởi tạo đúng số hộp thư/báo/mạng/điểm; trạng thái mới không dùng lại ván cũ.
- Lái, đạp/phanh; chọn mục tiêu trái/phải/tự động đúng phạm vi. Báo đang bay giữ
  mục tiêu, không giao hai lần vào một hộp. Thành công +100 đúng một lần;
  hết báo/cooldown/trạng thái kết thúc không ném thêm; ném trượt được tính đúng.
- Va chạm trừ một mạng trong thời gian bảo vệ, không trừ liên tiếp mỗi frame;
  vật cản vượt qua được dọn; hết mạng thua, tới cuối tuyến còn mạng thắng.
- Kiểm tra bản 2D trong iframe và 3D: input bàn phím/nút/kéo/chạm, HUD, mục tiêu
  và quỹ đạo khớp trạng thái; pause/resume, restart, đóng/mở và chuyển 2D/3D.
- Sau pointercancel/mất focus không kẹt lái/đạp hoặc ném ngoài ý muốn; sau pause
  không tiến triển ván. Kiểm tra lỗi nằm ở shared/3D hay tệp gốc ngoài SCOPE.

### Đua xe đạp

- Khởi tạo người chơi và 3 đối thủ, vị trí/tốc độ/năng lượng hữu hạn; seed cố định
  tái hiện được. Giữ các kiểm tra bước thời gian 30/60/120 Hz và dt bất thường.
- Lái có quán tính, không vượt biên; đạp/thả trôi/phanh/nước rút đúng ưu tiên,
  năng lượng đúng giới hạn; dốc, mặt đường, lề và núp gió có tác dụng như tài liệu.
- Va chạm, nhặt nước và bảo vệ sau va chạm áp dụng đúng một lần; AI không dịch
  chuyển tức thời; thứ hạng/về đích 1 km đúng, sau kết thúc không cập nhật ván.
- 2D/3D đồng nhất luật, HUD và điều khiển; camera/mặt đường/xe hiển thị đúng;
  pause/restart/đóng-mở không nhân listener, vòng lặp, audio hoặc tài nguyên WebGL.
- Bàn phím và cảm ứng: nhả/hủy nút không kẹt input; thử giữ lái + nước rút;
  tùy chọn âm thanh/giảm rung hoạt động theo tài liệu.

### Trình duyệt và CHECKS

- Ưu tiên mở offline qua `file://`, không tự mở server phát triển/cổng 4173.
  Điều chỉnh runner trong `tests/` nếu đường dẫn URL hiện có cần hỗ trợ file URL.
  Nếu cần HTTP để tái hiện lỗi riêng giao thức, báo lý do trước khi mở backend tạm.
- Dùng browser đã có, ưu tiên Edge/Chromium: desktop khoảng 1440×1000,
  mobile 390×844 và kiểm tra bố cục hẹp 320×740; cả hai game, cả 2D/3D.
  Lưu ảnh, console/pageerror và kết quả; phân biệt mô phỏng touch với thiết bị thật.
  Thiếu WebKit/WebGL thì ghi rõ phần chưa kiểm chứng, không cài bổ sung.
- Tests mục tiêu dự kiến:
  `node --test tests/core.test.js tests/race.test.cjs tests/arcade.test.js tests/lifecycle.test.js`.
  Bổ sung test vào suite hiện có khi phù hợp; nếu cần tệp mới chưa có trong npm test,
  chạy riêng và ghi rõ, không sửa package để ngầm thay CHECK.
- Browser: tái dùng `tests/browser-race.cjs` và `tests/browser-race-scene.cjs`
  với profile chọn lọc; thêm `tests/browser-paper-route.cjs` nếu cần luồng delivery
  tập trung. Tránh chạy toàn bộ thư viện game chỉ để kiểm tra hai game này.
- CHECK cuối luôn thử `npm.cmd test` mặc định có timeout. Nếu timeout, lưu nguyên
  verdict và chỉ chạy thêm một lượt tuần tự khi còn ngân sách:
  `npm.cmd test -- --test-concurrency=1 --test-timeout=250000`.
  Không bỏ test; kết quả tuần tự không được ghi thành pass cho cấu hình mặc định.
- `npm.cmd run lint` chỉ chạy nếu có script; nếu không có ghi “không áp dụng”.
  `npm.cmd run check` là kiểm tra cú pháp bổ sung.

## 5. Ngân sách, lưu bằng chứng và điểm dừng

- Ledger riêng `test-results/paper-route-verification/runs.json`, nhãn duy nhất;
  lưu lệnh, bắt đầu/kết thúc, thời lượng, exit code, timeout và đường dẫn log.
  Tổng 30 phút cho tests mục tiêu/toàn suite/cú pháp/lint/browser/tương tác và cleanup.
  Thời gian đọc nguồn, lập plan, sửa mã và chờ duyệt không tính là chạy kiểm thử.
- Dự kiến dành tối đa 5 phút baseline, 15 phút tái hiện/sửa/xác minh hẹp,
  10 phút cho CHECKS cuối và cleanup. Điều chỉnh phân bổ trong tổng 30 phút.
- Timeout mỗi lượt không vượt phần ngân sách còn lại, có dự phòng đóng tiến trình.
  Không chạy lại check đã pass trên cùng code nếu không có thay đổi/bằng chứng mới.
- Mỗi vòng sửa: tái hiện → sửa → kiểm tra. Tối đa 3 vòng cho toàn task, không
  đặt lại theo từng game hoặc khi tiếp tục phiên. Khi chưa tìm lỗi, báo phạm vi
  đã kiểm chứng; không thay code chỉ để tạo bản sửa.
- Hết giới hạn hoặc cần sửa ngoài SCOPE: ghi rõ phần đạt/chưa đạt, lỗi và bằng chứng;
  không tự mở rộng, không kéo dài kiểm thử. Chỉ dọn tiến trình do task tạo.
- `checks.md` dùng `step | requirement | verdict | evidence`, verdict
  `pass`/`fail`/`unresolved`. Báo cáo có kết quả riêng từng game, ảnh/log, lỗi trước/sau,
  vòng sửa, thời gian, phần chưa kiểm chứng và hướng dẫn tái chạy.
- Cập nhật `CLAUDE.md` khi có quy tắc dùng lại với bằng chứng; lưu diff so với đầu
  lượt. Tái dùng `harness.xml`, giữ nguyên các thay đổi có sẵn của người dùng.

**Đã bàn giao đợt 1: 414/414 test tuần tự, 12/12 lượt browser và 4/4 lượt bố cục đạt;
syntax đạt. Timeout npm test mặc định còn unresolved; xem OUTPUT và checks.**

---

<details>
<summary>Lưu kế hoạch Caro đã bàn giao và kế hoạch 2048 chưa hoàn tất</summary>

# Plan — Kiểm tra và sửa kết nối Caro online trên hai trình duyệt

Trạng thái: **ĐÃ BÀN GIAO CARO — còn timeout toàn suite mặc định**. Ngày: 2026-10-29.

Người dùng gửi task Caro khi baseline 2048 đang chạy. Lưu nguyên plan 2048 ở
cuối file để không mất công việc đã duyệt; chưa hoàn tất và chưa sửa code game 2048.
Đã xác minh Caro trên Edge + Chrome, bổ sung 5 test; chưa tái hiện lỗi cần sửa
mã sản phẩm. Backend tạm đã đóng. Toàn suite tuần tự đạt 410/410; xem OUTPUT
và `checks.md` để phân biệt với lượt mặc định bị timeout.

## A. Đầu vào và phạm vi đã duyệt

| Mục | Nội dung |
| --- | --- |
| TASK | Kiểm tra và sửa lỗi kết nối Caro online trên hai trình duyệt. |
| OUTPUT | `D:\1_Project\game_creator\docs\caro-online-verification.md` |
| CHECKS | `npm test`; `npm run lint` nếu có; kiểm tra thủ công hai phiên Caro online. Bổ sung `npm run check` và kiểm thử tích hợp kết nối. |
| SOURCES | `README.md`, `docs/caro-online.md`, `server/`, `tests/`. |
| SCOPE đã duyệt | `server/caro-online.cjs`, `games/online.js`, `games/caro-online-ui.js`, `games/boards.js`, `games/loader.js`, `arcade.js`, `scripts/serve.js`, `index.html`, `tests/`; chỉ sửa khi lỗi kết nối tái hiện cần thay đổi tại đó. |
| Tài liệu harness | `plan.md`, `checks.md`, `progress.md`, `CLAUDE.md` và OUTPUT. Log/ảnh tại `test-results/caro-online-verification/`. |
| LIMIT đã duyệt | Tối đa **3 vòng sửa tổng cộng và 30 phút kiểm thử cho Caro**. |
| Môi trường đã duyệt | Backend thật chỉ lắng nghe `127.0.0.1`, cổng ngẫu nhiên (`PORT=0`), hai tiến trình trình duyệt với dữ liệu độc lập; dọn toàn bộ tiến trình của phiên kiểm thử. |

Yêu cầu mới ban đầu chưa nêu SCOPE/LIMIT. Các giá trị trên đã được đề xuất và duyệt,
không áp dụng ngầm phạm vi 2048 cho server. Không sửa package/lockfile, cài thêm
dependency, mở cổng công khai, đổi firewall hoặc triển khai Internet.
Không dùng cổng 4173. Các thay đổi có sẵn từ công việc 3D được giữ nguyên.

`harness.xml` yêu cầu: “Lưu plan vào plan.md và tạm dừng để chờ phê duyệt.”
Người dùng đã duyệt riêng plan Caro bằng phản hồi “duyệt”. Triển khai theo phạm vi
và giới hạn ở trên; câu lệnh nhập lặp đã được người dùng yêu cầu bỏ qua.

## B. Bối cảnh tại thời điểm lập plan

- Backend thật: `server/caro-online.cjs`, được gắn vào HTTP server trong
  `scripts/serve.js`; đường dẫn WebSocket `/ws/caro`. Script hỗ trợ cổng 0 và
  in cổng thực tế sau khi lắng nghe; có xử lý đóng khi nhận SIGINT/SIGTERM.
- Client: `games/online.js`; session nằm trong `sessionStorage`, request có
  timeout và cơ chế reconnect/resume. UI nằm ở `games/caro-online-ui.js` và
  `games/boards.js`; loader và shell điều phối việc mở/đổi giao diện.
- `tests/online-server.test.cjs` dùng HTTP/WebSocket thật; client test hiện có
  mô phỏng kết nối. `tests/browser-online.cjs` dùng các context độc lập trong
  một engine, kiểm tra tạo/join/ready, lượt, reload, mất mạng, rematch và bỏ cuộc.
- Kiểm tra hai trình duyệt riêng bằng **Microsoft Edge và Google Chrome** đã
  xác nhận có executable trên máy. Dùng hai tiến trình và storage độc lập.
  Cả hai cùng nền Chromium; không gọi đây là kiểm chứng chéo Chromium/WebKit.
- Node hiện có: v24.21.0; npm 10.8.3; Playwright đã có trong `node_modules`.
  Các executable Chromium/WebKit/Firefox do Playwright quản lý chưa có tại
  đường dẫn mặc định. Không cần cài thêm vì Edge và Chrome hệ thống đều có.
- Không có script lint. `npm run check` chỉ kiểm tra cú pháp, không thay lint.
- Baseline toàn dự án đã bắt đầu dưới task 2048: `npm test` bị timeout sau
  182.660 giây (ngưỡng runner 180 giây, có thời gian đóng tiến trình).
  Log có các test online đạt nhưng chưa có kết luận toàn suite; không báo npm test pass.
  Bằng chứng: `test-results/2048/baseline-test.log`, `test-results/2048/runs.json`.
  Khi thực thi Caro, cần xác định timeout do test/tiến trình chưa thoát hay do môi trường.
- Baseline cú pháp 2048 đã đạt: `npm run check`, exit 0, 105.584 giây.
  Tổng ngân sách 2048 đã dùng: 288.244 giây (4 phút 48.244 giây), 0 vòng sửa.
  Kiểm tra sau khi kết thúc không thấy tiến trình runner/test/check còn chạy,
  không có listener trên cổng 4173. Task Caro chưa chạy test.
- Chưa có bằng chứng tái hiện lỗi kết nối từ hai trình duyệt. Không kết luận nguyên nhân
  chỉ bằng đọc code hoặc kết quả cũ trong tài liệu.
- Khi lập plan, sandbox shell lỗi khởi tạo. Môi trường thực thi sau đó đã cho phép
  chạy lệnh trực tiếp; không còn blocker này. Kết quả thực tế nằm trong OUTPUT.

## C. Các bước, đầu ra và kiểm tra

| Bước | File đọc | File ghi | Đầu ra | Check hoàn thành | Song song |
| --- | --- | --- | --- | --- | --- |
| 1. Baseline và môi trường | Hướng dẫn áp dụng, plan/progress/CLAUDE, README, docs Caro, package, scripts/serve, server/tests online; diff có sẵn | Log, checks/progress; helper có timeout trong tests nếu cần | Phiên bản công cụ, port/PID do test sở hữu, trạng thái suite và cấu hình backend | `npm.cmd test`, `npm.cmd run check`; xác nhận lint; nếu timeout thì cô lập test liên quan và ghi đúng nguyên nhân chưa biết | Không; đo ngân sách trước |
| 2. Tái hiện hai người chơi | games/online, caro-online-ui, boards, shell/loader, browser-online và unit tests | Regression test trong tests nếu có khoảng trống; log/ảnh | Kết quả từng tình huống ở mục D, lỗi có bước tái hiện | Hai trình duyệt thật kết nối backend thật; so phòng, lượt và bàn ở cả hai phía | Các phần đọc có thể độc lập; thực hiện một phiên, không dùng subagent |
| 3. Sửa có bằng chứng | Đoạn nguồn và test gây lỗi | Chỉ file SCOPE cần thiết; test hồi quy; metadata harness | Bản sửa nhỏ, nêu trước/sau và nguyên nhân | Test tái hiện fail trước sửa và pass sau sửa; tối đa 3 vòng toàn task | Không |
| 4. Xác minh cuối | Diff cuối và checklist | Log/ảnh, checks/progress | Verdict trên code cuối cho mỗi CHECK | Toàn bộ `npm.cmd test`; lint nếu có; syntax; browser regression; kiểm tra thủ công và dọn backend | Không; theo dõi tổng thời gian |
| 5. Bàn giao | Bằng chứng và diff | OUTPUT, plan/checks/progress/CLAUDE | Báo cáo mở được, hướng dẫn tái chạy, giới hạn và phần còn lỗi | OUTPUT đầy đủ; không có sửa ngoài phạm vi; tiến trình/cổng test đã đóng | Không |

Không thay đổi code nếu không có lỗi tái hiện. Nếu cần sửa ngoài SCOPE đã duyệt,
trình bày bằng chứng và xin mở rộng trước khi sửa. Test bị timeout không được chạy
lặp vô hạn; cô lập bước gây chặn để sử dụng ngân sách có ích.

## D. Tiêu chí chấp nhận đặt trước

1. Hai trình duyệt/phiên có storage độc lập, mở cùng backend HTTP thật; tạo phòng
   ở A, vào bằng mã và bằng link mời ở B. Mỗi bên có ghế/token riêng; không ghi
   token vào báo cáo, ảnh/log công khai hoặc link mời.
2. Chỉ bắt đầu khi cả hai sẵn sàng. Hai phía thấy cùng room/round/version/board;
   nước đúng lượt chỉ được áp dụng một lần, không nhận nước sai lượt/ô đã có quân.
3. Reload A/B giữ đúng ghế và bàn, không tạo người chơi thứ ba hoặc kẹt pending.
   Đổi 2D/3D nếu WebGL có sẵn không mất phiên online.
4. Ngắt mạng một phía rồi kết nối lại trong thời gian giữ ghế: trạng thái hiển thị
   đúng, phía còn lại không đánh khi đối thủ mất kết nối; resume nhận bàn từ server,
   không gửi lại nước cũ không rõ đã được chấp nhận hay chưa.
5. Kiểm tra kết nối bị đóng đột ngột, request timeout và reconnect; chặn sự kiện
   socket cũ làm ghi đè phiên mới. Kiểm tra hết hạn giữ ghế bằng test có đồng hồ hoặc
   timeout cấu hình ngắn, không chờ dài vô ích trong browser test.
6. Phòng đầy, mã sai, backend không chạy hoặc endpoint không hợp lệ phải hiện
   thông báo có thể hiểu được và cho phép thử lại. File HTML trực tiếp giải thích
   rằng online cần HTTP/HTTPS. Kiểm tra WS/WSS theo URL, giữ nguyên kiểm tra Origin.
7. Chơi đến thắng, cả hai đồng ý rematch, đổi quân đúng; rời phòng kết thúc đúng
   và hủy reconnect/timer. Phiên đã rời không tự chiếm lại ghế khi mạng trở lại.
8. Thao tác/quan sát hai phiên thực tế: tạo, vào, sẵn sàng, đánh qua lại, reload,
   mất/kết nối lại và rời; lưu ảnh hai phía và nhật ký thao tác. Phân biệt Playwright
   tự động, quan sát ảnh và kiểm tra thủ công. Nếu công cụ không cho tương tác thủ
   công đầy đủ thì CHECK đó là `unresolved`, không thay bằng unit test.
9. Không lỗi JavaScript hoặc lỗi WebSocket ngoài tình huống ngắt mạng có chủ đích.
   Không coi hai phiên local là kiểm chứng hai thiết bị thật trên LAN/Internet.
10. Backend/browser do task tạo phải được đóng trong cleanup kể cả khi fail/timeout.
    Xác nhận cổng tạm không còn lắng nghe; không dừng tiến trình có sẵn của người dùng.

## E. Ngân sách, bằng chứng và điểm dừng

- Giới hạn đã duyệt: ba vòng sửa tổng cộng; mỗi vòng gồm tái hiện → sửa → check.
- Đếm tổng thời lượng các lần test, lint/syntax, browser và kiểm tra thủ công của
  task Caro. Mốc tối đa 30 phút; ghi bắt đầu/kết thúc và exit code từng lượt.
  Baseline của task 2048 được ghi riêng, không xóa hoặc đặt lại lịch sử của nó.
- Mỗi tiến trình có timeout và cleanup. Dành khoảng 10 phút cuối cho xác minh
  code cuối; không tiếp tục sửa khi không đủ thời gian kiểm tra.
- `checks.md`: `step | requirement | verdict | evidence`, verdict pass/fail/unresolved.
  Lint không có ghi rõ điều kiện không áp dụng; không coi syntax là lint.
- `progress.md`: phase, file, quyết định, lỗi/bằng chứng, vòng sửa, thời gian,
  blocker và bước tiếp. `CLAUDE.md` chỉ thêm quy tắc dùng lại có bằng chứng.
- OUTPUT nêu phạm vi, cấu hình hai trình duyệt, backend/cổng, cách tái hiện,
  bản sửa, kết quả từng CHECK, đường dẫn log/ảnh, phần chưa kiểm chứng và cleanup.
- Hết ngân sách hoặc bị chặn thì báo trạng thái một phần, không gọi pass và
  không tự tăng giới hạn. Không commit/push/deploy hoặc cài thêm dependency.
- Tái sử dụng `harness.xml` hiện có; chưa tạo mẫu khác ngoài phạm vi.

**Đã bàn giao `docs/caro-online-verification.md`: Caro đạt các luồng hai trình duyệt,
21/21 test online, 410/410 toàn suite tuần tự và kiểm tra cú pháp. Lượt toàn suite
mặc định timeout vẫn unresolved. Đã dùng 1.674,947/1.800 giây, 0/3 vòng sửa sản phẩm;
không còn tiến trình kiểm thử của task.**

---

<details>
<summary>Plan 2048 đã duyệt — giữ lại để tiếp tục, chưa hoàn tất</summary>

## Plan — Kiểm tra và sửa lỗi 2048

Trạng thái: **ĐÃ DUYỆT — LƯU TẠI BASELINE KHI CHUYỂN SANG CARO**. Ngày lập/duyệt: 2026-10-29.

Người dùng đã duyệt toàn bộ plan, gồm `checks.md`, `progress.md`, `CLAUDE.md`.
Kết quả và ngân sách thực tế được ghi trong `progress.md`, `checks.md` và OUTPUT.

## 1. Yêu cầu và giới hạn

| Mục | Nội dung |
| --- | --- |
| TASK | Kiểm tra và sửa lỗi game 2048; kiểm tra cả giao diện 2D và 3D đang có. |
| OUTPUT | `D:\1_Project\game_creator\docs\2048-verification.md` |
| CHECKS | `npm test`; `npm run lint` nếu có; kiểm tra thủ công 2048. Bổ sung `npm run check` đang có để kiểm tra cú pháp. |
| SOURCES | `README.md`, `docs/caro-online.md`, `server/`, `tests/`; chỉ đọc thêm nguồn trực tiếp phục vụ 2048. |
| SCOPE code | Chỉ sửa trong `tests/`, `games/`, `assets/` hoặc `index.html`, khi có bằng chứng liên quan đến lỗi 2048. |
| LIMIT | Tối đa **3 vòng sửa lỗi tổng cộng**, tối đa **30 phút thực hiện kiểm thử**. |
| Phê duyệt | Đã nhận: “ok plan ổn rồi thực hiện theo nhé”. |

Áp dụng `harness.xml` theo yêu cầu và `.agents/skills/harness/SKILL.md` cho quy trình.
Khi có khác biệt, ưu tiên yêu cầu cụ thể của người dùng và `harness.xml` được chỉ định.

## 2. Kết quả đọc nguồn trước khi lập plan

- `games/logic.js` có `create2048`, `add2048Tile`, `move2048`, `canMove2048`.
  `games/boards.js` quản lý bàn 4 × 4, điểm, số nước, kỷ lục và kết thúc ván.
- `games/3d/board-views.js` có renderer 2048; hai giao diện dùng chung luật.
- `tests/arcade.test.js` đã có ba bài kiểm thử 2048: gộp một lần, bất biến đầu vào,
  bốn hướng, nước không đổi, sinh ô và nhận biết bàn hết nước. Đây là nội dung
  đã đọc, chưa phải kết quả chạy trong task này.
- `tests/browser-3d.cjs` đã có kịch bản 2048. Cần đọc kỹ trước khi tái sử dụng;
  mặc định script này dùng HTTP cổng 4173 và kiểm tra nhiều game khác.
- `package.json` có `test` và `check`, **không có script `lint`**.
  Không cài công cụ lint hoặc sửa package chỉ để thêm lệnh.
- `server/caro-online.cjs` dùng chung `games/logic.js`; đây là lý do phải chạy
  đầy đủ `npm test` để phát hiện ảnh hưởng ngoài 2048. Server chỉ được đọc.
- `tests/online-server.test.cjs` tạo server tạm tại `127.0.0.1` với cổng ngẫu nhiên
  và đăng ký đóng sau test. Không cần mở server phát triển cổng 4173.
- Có nhiều thay đổi chưa commit từ công việc 3D trước đó, gồm cả `index.html`
  và một số tests. Giữ nguyên các thay đổi không thuộc task; không reset/revert.
- Chưa tìm thấy `AGENTS.md`, `CLAUDE.md`, `plan.md`, `checks.md` hoặc `progress.md`
  có sẵn trong các đường dẫn đã rà soát trước khi tạo plan này.
- Shell trong sandbox đang lỗi khởi tạo; các lần đọc nguồn đã thực hiện qua
  lệnh chỉ đọc được cấp quyền ngoài sandbox. Đây là hạn chế công cụ hiện tại,
  không phải bằng chứng về lỗi game.

## 3. Phạm vi file và phần cần duyệt

**Được người dùng nêu đích danh:** `plan.md` này và `docs/2048-verification.md`.

**Các file code dự kiến đọc và có thể sửa khi xác định được lỗi:**

- `games/logic.js`, `games/boards.js`, `games/shared.js`.
- `games/3d/board-views.js` và thành phần 3D liên quan trực tiếp nếu lỗi thuộc renderer.
- `tests/arcade.test.js`, `tests/lifecycle.test.js`; có thể tạo
  `tests/browser-2048.cjs` để kiểm tra riêng game qua `file://`.
- `assets/` hoặc `index.html` chỉ khi lỗi tái hiện cho thấy cần thay đổi tại đó.

Đọc thêm `games/loader.js`, `games/layouts.js`, `arcade.js`, CSS liên quan,
`package.json`, `scripts/check.js`, các browser test và hướng dẫn trong thư mục
được sửa. `arcade.js`, CSS ngoài phạm vi, `README.md`, `server/`, `package.json`,
lockfile và cấu hình môi trường không thuộc phạm vi sửa code.
Nếu lỗi buộc phải sửa ngoài phạm vi này, báo bằng chứng và xin mở rộng trước.

**Đề xuất duyệt cùng plan:** cho phép tạo/cập nhật riêng ba file ghi nhận harness
`checks.md`, `progress.md`, `CLAUDE.md` ở gốc dự án. Chúng nằm ngoài SCOPE code,
nhưng được `harness.xml` yêu cầu ở các phần verification, handoff và delivery.
`CLAUDE.md` chỉ ghi quy tắc có bằng chứng, lệnh kiểm tra và giới hạn áp dụng;
không ghi rằng đã khắc phục lỗi khi chưa xác minh. Không tạo/sửa `AGENTS.md`.
Nếu người dùng không duyệt ba file này, giữ nguyên ranh giới và ghi các phần
check/progress trong OUTPUT, đồng thời nêu phần harness chưa thực hiện.

Log và ảnh bằng chứng sẽ nằm dưới `test-results/2048/` đã được Git bỏ qua,
hoặc thư mục tạm nếu cần. Đây là sản phẩm kiểm thử, không phải sửa code nguồn.
Tái sử dụng `harness.xml` làm mẫu harness hiện có; việc tạo thêm mẫu chỉ thực hiện
sau review và khi được cho phép về phạm vi.

## 4. Các bước thực hiện sau khi được duyệt

| Bước | Đọc | Ghi | Đầu ra quan sát được | Check hoàn thành | Song song |
| --- | --- | --- | --- | --- | --- |
| 1. Chốt baseline | Plan đã duyệt; hướng dẫn áp dụng; Git diff các file liên quan; package; sources và mã 2048 nêu trên | `progress.md`, `checks.md` nếu được duyệt; log kiểm thử | Danh sách thay đổi có sẵn, môi trường và trạng thái trước sửa | Chạy `npm.cmd test`, `npm.cmd run check`; xác nhận script lint có/không; lưu lệnh, exit code và thời gian | Không; làm mốc đo thời gian trước |
| 2. Tái hiện và kiểm tra 2048 | Logic, boards, shared, renderer; tests hiện có và loader | Test bổ sung trong `tests/` khi cần; log/ảnh; bảng check | Trường hợp lỗi tái hiện, hoặc bằng chứng các yêu cầu đã đạt | Kiểm tra bộ tình huống ở mục 5 bằng logic và trình duyệt; ghi riêng kết quả quan sát thủ công | Có thể tách đọc luật và đọc UI, nhưng thực hiện một phiên, không dùng subagent |
| 3. Sửa có giới hạn | Bằng chứng fail và đoạn mã liên quan | Chỉ file code trong SCOPE; regression test cần thiết; ghi nhận harness | Bản sửa nhỏ gắn với lỗi cụ thể, hoặc xác nhận không cần sửa | Test hồi quy phải bắt được lỗi trước sửa và đạt sau sửa; không sửa chỉ để thay đổi code | Không; tối đa 3 vòng tổng cộng |
| 4. Xác minh bản cuối | Diff cuối, kịch bản đã chạy và CHECKS | Log/ảnh, `checks.md`, `progress.md` nếu được duyệt | Verdict mới nhất cho bản code cuối | `npm.cmd test`; `npm.cmd run lint` nếu thực sự có; `npm.cmd run check`; kiểm tra trình duyệt/thủ công lại các luồng bị ảnh hưởng | Không; ưu tiên đo rõ ngân sách và giữ bằng chứng theo phiên |
| 5. Bàn giao | Log, ảnh, diff, plan và bảng check | `docs/2048-verification.md`; cập nhật plan và các file harness đã duyệt | Báo cáo mở được, lỗi đã sửa hoặc còn tồn tại, hướng dẫn tái chạy | Kiểm tra đủ OUTPUT; mỗi CHECK có verdict và bằng chứng; rà phạm vi diff; dọn tiến trình kiểm thử do task tạo | Không; phụ thuộc bước xác minh |

Không chạy lại check đã đạt trên cùng phiên bản nếu không có thay đổi hoặc bằng
chứng mới cần kiểm tra. Nếu không tìm được lỗi, vẫn hoàn tất báo cáo trung thực.

## 5. Tiêu chí chấp nhận đặt trước

### Luật và trạng thái

- Khởi tạo bàn có đúng 16 ô, hai ô mang giá trị 2 hoặc 4.
- Trượt đủ bốn hướng, dồn khoảng trống đúng; mỗi ô chỉ gộp một lần mỗi nước.
  Ví dụ sang trái: `[2,2,2,2] → [4,4,0,0]`, điểm 8;
  `[2,2,4,0] → [4,4,0,0]`, điểm 4; có thêm trường hợp xen ô trống.
- `move2048` giữ nguyên đầu vào; điểm bằng tổng giá trị ô tạo ra do gộp.
- Nước thay đổi bàn sinh đúng một ô mới vào vị trí trống, giá trị 2 hoặc 4.
  Nước không đổi không sinh ô, không cộng điểm và không tăng số nước.
- Bàn đầy còn cặp ngang hoặc dọc vẫn chơi được. Bàn không còn nước mới kết thúc.
- Đạt 2048 thông báo thành tích và vẫn chơi tiếp theo README; chơi lại khôi phục
  điểm/số nước/trạng thái ván mới, giữ kỷ lục phù hợp.
- Dùng RNG kiểm soát được và trạng thái mẫu trong test để tái hiện ổn định;
  không thêm cửa điều khiển test công khai vào game chỉ để tiện kiểm thử.

### Giao diện và kiểm tra thủ công

- Mở `index.html` qua `file://`, vào 2048 2D và 3D, xác nhận bàn hiển thị đúng.
  Không tự mở server phát triển hoặc cổng 4173.
- Chơi bằng mũi tên/WASD, nút hướng và thao tác vuốt; mỗi thao tác chỉ tạo số
  nước tương ứng, không cuộn trang ngoài ý muốn khi đang điều khiển bàn.
- Quan sát điểm, kỷ lục, số nước, thông báo đạt 2048, kết thúc và chơi lại.
- Tạm dừng không nhận nước đi; tiếp tục, chơi lại, đóng rồi mở không tạo listener
  trùng hoặc để timer/overlay của ván trước tác động vào ván mới.
- Kiểm tra desktop khoảng 1366 × 900 và mobile 390 × 844, bổ sung 320 × 740
  cho bố cục hẹp; nút điều khiển, ô số và overlay vẫn đọc/nhấn được.
- Kiểm tra đồng bộ số trên bàn 3D với trạng thái game và xử lý lỗi WebGL nếu
  môi trường cho phép. Không có WebGL thì ghi rõ phần chưa xác minh.
- Lưu ảnh các trạng thái chính, ghi thao tác và kết quả quan sát thực tế.
  Phân biệt kiểm thử tự động, kiểm tra trực quan/tương tác qua công cụ trình duyệt
  và kiểm tra trên thiết bị thật; không gọi mô phỏng cảm ứng là kiểm tra điện thoại thật.
  Nếu không có công cụ tương tác đủ để kiểm tra thủ công, ghi `unresolved`,
  không dùng kết quả unit test để thay thế CHECK này.
- Ghi nhận lỗi JavaScript/console phát sinh liên quan đến 2048.

### Các lệnh CHECKS

- `npm.cmd test` là cách gọi `npm test` trên PowerShell, tránh vướng execution policy.
- `npm.cmd run lint` chỉ chạy nếu script tồn tại ở thời điểm thực thi. Hiện chưa
  có script: ghi điều kiện không áp dụng, không báo là lint đã pass.
- `npm.cmd run check` là kiểm tra cú pháp bổ sung, không thay thế lint.
- Test riêng dự kiến: `node --test --test-name-pattern=2048 tests/arcade.test.js`;
  nếu tạo browser test riêng thì chạy `node tests/browser-2048.cjs`.
- Không cài thêm dependency hoặc sửa cấu hình toàn cục. Nếu thiếu trình duyệt,
  dependency hay quyền chạy, ghi chính xác blocker và phần chưa kiểm chứng.
- Unit test online có thể mở cổng loopback ngẫu nhiên trong thời gian chạy;
  xác nhận tiến trình do task tạo được đóng, không để server nền tồn tại sau kiểm tra.

## 6. Vòng sửa, thời gian và bằng chứng

- Một vòng sửa gồm: ghi lỗi tái hiện → sửa trong SCOPE → chạy lại check liên quan.
  Tối đa ba vòng cho toàn task, không tính lại từ đầu khi chuyển file hoặc check.
- Bắt đầu bộ đếm khi chạy check đầu tiên sau duyệt. Cộng thời lượng thực tế
  của các lượt test/cú pháp/lint/trình duyệt và kiểm tra thủ công; tối đa 30 phút.
  Thời gian đọc nguồn, viết plan, chờ duyệt và sửa code không phải thời gian chạy test.
- Ghi thời điểm bắt đầu/kết thúc, thời lượng từng lượt và tổng đã dùng. Đặt timeout
  theo ngân sách còn lại; dừng kiểm thử đang chạy nếu chạm giới hạn.
- Ưu tiên dành khoảng 10 phút cuối ngân sách cho CHECKS trên bản code cuối.
  Không mở vòng sửa mới khi không còn thời gian xác minh có ý nghĩa.
- Khi hết giới hạn hoặc gặp blocker, dừng triển khai, ghi trạng thái từng check;
  không tuyên bố hoàn tất nếu còn lỗi/chưa kiểm tra và không tự tăng giới hạn.
- `checks.md` dùng cột `step | requirement | verdict | evidence` với
  `pass`, `fail`, `unresolved`; CHECK có điều kiện không áp dụng được giải thích rõ.
- `progress.md` ghi bước đang làm/đang chặn, đường dẫn đầu ra, quyết định và lý do,
  vấn đề còn mở, số vòng sửa, ngân sách đã dùng và bước tiếp theo.
- Báo cáo OUTPUT gồm phạm vi, môi trường, lỗi tái hiện/nguyên nhân/bản sửa,
  kết quả CHECKS và quan sát thủ công, log/ảnh, số vòng/thời gian, phần chưa xác minh.
- Nếu tiếp tục ở phiên khác, đọc plan, progress và CLAUDE trước; dùng số vòng và
  thời gian đã ghi, không khởi động lại ngân sách. Chỉ báo usage khi có số liệu thật.

## 7. Điều kiện bàn giao

1. OUTPUT tồn tại, nội dung phù hợp bằng chứng và mở đọc được.
2. Mỗi CHECK có kết quả trên bản code cuối hoặc lý do `unresolved` rõ ràng.
3. Không còn thay đổi ngoài phạm vi được duyệt; không mất công việc có sẵn.
4. Các file harness đã được duyệt phản ánh đúng trạng thái; có diff CLAUDE nếu tạo/sửa.
5. Tiến trình kiểm thử do task tạo đã đóng; không mở server phát triển cổng 4173.

**Đang lưu tại bước baseline vì người dùng gửi task Caro; xem `progress.md`
và `test-results/2048/runs.json`. Chưa sửa code game 2048.**

</details>

</details>
