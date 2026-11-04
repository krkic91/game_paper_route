# Checks — Cờ tỷ phú, 01/11/2026

| step | requirement | verdict | evidence |
| --- | --- | --- | --- |
| Plan | Đã duyệt 4 đề xuất đầu | pass | Yêu cầu mới nhất, plan.md; baseline hash đã lưu. |
| Unit | Preview/portfolio/flow, luật và adapter | pass | baseline-unit 21/21, implementation-unit 30/30; bản cuối các test này đều đạt trong suite-recheck. Có 300 ván có seed, read-only/không đọc thẻ kín, receipt không tính tiền hoàn hai lần. |
| Browser | 2D/3D desktop/mobile và vòng đời | pass | feature-browser 6/6; owner-badges-browser 3/3 bản 3D cuối, errors=[]; đã xem ảnh 320/390 px. Tổng 6 cấu hình; có chạm/Enter, mua/xây/bỏ qua/thanh lý/phá sản, pause/restart/close và dispose. |
| Suite | Toàn suite | pass | final-suite 442/443, fail duy nhất test Caro resource-limit; cô lập đạt 1/1; suite-recheck đạt 443/443, exit 0. Cả hai lần dùng npm.cmd test -- --test-concurrency=1 --test-timeout=250000, không bỏ test hoặc sửa Caro. |
| Syntax / lint | Cú pháp; lint nếu có | pass | final-syntax: npm.cmd run check exit 0; package không có script lint. |
| Handoff | Report, phạm vi, bảo toàn dữ liệu, cleanup | pass | docs/monopoly-verification.md; final-audit.json: 25 hash giữ nguyên, adapter game khác không đổi, không ngoài scope, output/liên kết/diff check đạt; không Node test/Edge Playwright/listener 4173. Ledger tổng 361.771 ms, 1/3 vòng chỉnh giao diện. |

## Domino / Bida, 30/10/2026

| step | requirement | verdict | evidence |
| --- | --- | --- | --- |
| Plan | Đã duyệt, gợi ý chỉ khi bấm nút riêng | pass | Yêu cầu mới nhất của người dùng; plan.md. |
| Unit | Domino, hướng ngắm Bida, luật cũ, adapter Ma sói | pass | baseline-unit 66/66; implementation-unit 77/77, exit 0. Log tại test-results/domino-pool-verification/. |
| Browser | 2D/3D desktop/mobile, vòng đời | pass | Domino 6/6 tại feature-browser; Bida 5/6 tại pool-browser-round1 + 320px 3D đạt tại pool-mobile-round2. Tổng hợp 12 cấu hình, errors=[], không tràn ngang, dispose cảnh khi đóng. Hai lỗi của bài test và cách sửa được ghi trong report. |
| Suite | Toàn suite tuần tự | pass | final-suite.log: npm.cmd test -- --test-concurrency=1 --test-timeout=250000, 434/434, exit 0. |
| Syntax / lint | Cú pháp; lint nếu có | pass | final-syntax.log: npm.cmd run check, exit 0; package không có script lint. |
| Handoff | OUTPUT, bảo toàn Ma sói, ngân sách/cleanup | pass | docs/domino-pool-verification.md; final-audit.json xác minh 9 hash Ma sói, adapter chỉ đổi một dòng Domino, không ngoài phạm vi, output/liên kết hợp lệ, diff check exit 0; không test Node/Edge/listener 4173. Ledger tổng 221.690 ms, 2/3 vòng. |

## Ma sói, 30/10/2026

| step | requirement | verdict | evidence |
| --- | --- | --- | --- |
| Plan | Đợt 1 đã duyệt | pass | “ok sửa giúp tôi nhé”; plan.md. |
| Baseline | Luật cũ, tái hiện adapter | pass | baseline-unit.log 14/14; baseline-adapter.log fail đúng 8 mô hình thay vì 7; fixed-adapter.log đạt 1/1 sau sửa. |
| Logic | Phát biểu, phiếu, thông tin kín, máy và ván hoàn chỉnh | pass | feature-unit.log 23/23, exit 0, 2.768 giây; gồm 400 ván có seed. |
| Browser | 2D/3D, desktop/mobile, vòng đời | pass | feature-browser/results.json 6/6, 37.879 giây; 1280/390/320 px, pageErrors=[]; đã xem ảnh mobile. |
| Suite | npm test tuần tự | pass | `npm test -- --test-concurrency=1 --test-timeout=250000`: final-serial-recheck.log 423/423, không skip, exit 0, 106.733 giây. Giữ final-serial.log lần đầu 422/423, exit 1, 108.668 giây. Không chạy npm test mặc định trong task này. |
| Chẩn đoán | Chạy riêng đúng test Caro không đạt | pass | online-isolated.log: 1/1, exit 0, 0.711 giây. Chưa xác định chắc chắn nguyên nhân; không sửa server hoặc tests Caro. |
| Syntax | npm run check | pass | final-syntax.log: exit 0, 30.481 giây. |
| Lint | npm run lint nếu có | pass | Điều kiện không áp dụng: package.json không có script lint. |
| Scope | Chỉ sửa phần đã duyệt | pass | Git baseline sạch; 14 tệp thay đổi đều thuộc plan; git diff --check đạt. Không sửa server/test Caro, package hoặc AGENTS.md. |
| Budget | Tối đa 3 vòng sửa và 30 phút kiểm thử | pass | 1 vòng sửa lỗi 3D đã tái hiện; 9 lượt trong runs.json tổng 289.286 giây + cleanup 2.082 = 291.368/1.800 giây. |
| Cleanup | Không để test/browser/server chạy nền | pass | final-cleanup.json: processes=[], listeners=[]; đã kiểm tra cổng 4173/4174/3000/8080. Browser dùng file://; chỉ unit online dùng loopback tạm. |
| Handoff | OUTPUT và metadata đọc được | pass | docs/werewolf-verification.md, hướng dẫn và plan/checks/progress/CLAUDE đã chốt; CLAUDE-werewolf.diff tồn tại; các liên kết bằng chứng hợp lệ. |

## Giao báo / đua xe, 29/10/2026

| step | requirement | verdict | evidence |
| --- | --- | --- | --- |
| Plan | Đợt cải tiến được duyệt | pass | “ok bạn làm đi nhé”; “tiếp tục” sau câu hỏi tệp gốc; plan.md. |
| Unit | Logic hai game và hướng dẫn mới | pass | 86/86, exit 0; test-results/paper-route-verification/feature-unit.log. |
| Browser | 2 game × 2 renderer × 3 viewport | pass | 12/12, exit 0; test-results/paper-route-verification/final-browser/results.json. |
| Bố cục | Nhãn tay đua không chồng nhau | pass | final-layout/results.json: 4/4, cả 2D/3D trên 390/320 px. |
| Full suite | npm test mặc định trên bản cuối | unresolved | final-test.log: timeout 360 giây, tổng 362.982 gồm cleanup; không có tổng kết suite. |
| Full suite | npm test tuần tự trên bản cuối | pass | `npm test -- --test-concurrency=1 --test-timeout=250000`: 414/414, exit 0, không skip, 205.785 giây; final-serial.log. |
| Syntax | npm run check | pass | Exit 0, 40.063 giây; final-syntax.log. |
| Lint | npm run lint nếu có | pass | Điều kiện không áp dụng: không có script lint. |
| Cleanup | Không để lại tiến trình test hoặc cổng thử nghiệm | pass | final-cleanup.json: processes=[], listeners=[] trên 4173/4174/3000/8080; task không mở server. |
| Budget | Tối đa 3 vòng sửa và 30 phút kiểm thử | pass | 2/3 vòng; runs.json có 9 lượt, tổng 882.715 giây, thêm 1.757 giây xác nhận cleanup: 884.472/1.800 giây. |
| Handoff | OUTPUT, phạm vi và metadata | pass | docs/paper-route-verification.md; plan/progress/CLAUDE và CLAUDE-paper-route.diff. Giữ thay đổi có sẵn, chỉ sửa mã trong phạm vi đã duyệt. |

## Caro online — lưu kết quả bàn giao 29/10/2026

Các log/ảnh Caro bên dưới nằm trong `test-results/caro-online-verification/`.
Không sửa mã sản phẩm vì chưa tái hiện được lỗi kết nối. Toàn suite cuối đạt 410/410
khi chạy tuần tự; lượt mặc định bị timeout được giữ riêng là unresolved.

| step | requirement | verdict | evidence |
| --- | --- | --- | --- |
| Plan | Duyệt trước triển khai Caro | pass | Người dùng phản hồi “duyệt”; `plan.md`. |
| Baseline | npm test | pass | 405/405, exit 0, 163.558 giây; `baseline-test.log`. |
| Online | Unit server/client sau bổ sung 5 test | pass | 21/21, exit 0, 5.152 giây; `extended-online.log`. |
| Browser | Hai trình duyệt, storage độc lập, backend thật | pass | Edge 156.0.4314.50 + Chrome 156.0.8078.48; `baseline-browsers-browsers.json`, `baseline-browsers.log`. |
| Browser | Tạo/join/ready, sai lượt, đồng bộ, reload, offline/resume, thắng/rematch, 2D/3D, rời phòng | pass | `tests/browser-online.cjs` qua runner hai executable; ảnh `baseline-browsers/`. |
| Tương tác | Hai phiên thao tác từng bước và quan sát ảnh | pass | Agent điều khiển qua Playwright, xem ảnh; `manual-transcript.jsonl`, `manual-resume-transcript.jsonl`, thư mục ảnh tương ứng. Không phải thiết bị thật. |
| Timeout | Kết nối ban đầu, mất ACK, backoff, phiên bị thay thế, endpoint | pass | Năm test mới dùng đồng hồ điều khiển trong `tests/online-client.test.cjs`. |
| Final | npm test mặc định trên tests cuối | unresolved | `final-test.log`: timeout ngưỡng 360 giây (361.604 gồm cleanup), chưa có tổng kết toàn suite. Các test online đã đạt. |
| Final | npm test với các file chạy tuần tự | pass | `npm test -- --test-concurrency=1 --test-timeout=250000`: 410/410, exit 0, không skip, 182.531 giây; `final-test-serial.log`. |
| Final | npm run check | pass | Exit 0, 35.335 giây; `final-syntax.log`. |
| Lint | npm run lint nếu có | pass | Điều kiện không áp dụng: package.json không có script lint; không báo lint đã chạy. |
| Cleanup | Đóng backend do task tạo | pass | Cổng 51400, 51570, 55987: ba file `*-cleanup.json` có `serverExited=true`, `portClosed=true`; `final-cleanup.json` không có listener các cổng đó/4173 hoặc tiến trình của task. |
| Scope | Bảo toàn thay đổi có sẵn, không sửa ngoài phạm vi đã duyệt | pass | Task Caro chỉ sửa/bổ sung tests và tài liệu harness/OUTPUT; source server/client không đổi. |
| Budget | Tối đa 3 vòng sửa và 30 phút kiểm thử | pass | 0 vòng sửa sản phẩm; `runs.json` có 10 lượt, tổng 1.674,947/1.800 giây, gồm cả hai lượt timeout. |
| Handoff | OUTPUT, plan/progress/CLAUDE và bằng chứng | pass | `docs/caro-online-verification.md`, `plan.md`, `progress.md`, `CLAUDE.md`; diff tại `test-results/caro-online-verification/CLAUDE-caro.diff`. Không sửa AGENTS.md. |

Phiên manual đầu bị timeout trong thời gian gián đoạn, vẫn tính toàn bộ 603.429
giây vào ledger. Phiên manual-resume hoàn tất với exit 0, 131.074 giây, pageErrors=[];
không xóa kết quả timeout khỏi lịch sử.

## Trạng thái 2048 giữ lại

Task 2048 chưa hoàn tất, chưa sửa code game; 0/3 vòng sửa, 288.244/1800 giây.

| step | requirement | verdict | evidence |
| --- | --- | --- | --- |
| Plan | Người dùng duyệt trước sửa code/kiểm thử | pass | Phản hồi: “ok plan ổn rồi thực hiện theo nhé”. |
| Baseline 2048 | npm test | unresolved | Timeout 180 giây; thời lượng gồm cleanup 182.660 giây, child exit 1, runner exit 124. `test-results/2048/baseline-test.log`, `runs.json`. Không có kết quả toàn suite. |
| Cú pháp baseline 2048 | npm run check | pass | Exit 0, 105.584 giây; `test-results/2048/baseline-syntax.log`. |
| Lint | npm run lint nếu có | pass | Điều kiện không áp dụng: package.json không có script lint; không có kết quả chạy lint. |
| 2048 | Luật, UI 2D/3D, vòng đời | unresolved | Chưa chạy. |
| Thủ công | Tương tác và quan sát thực tế | unresolved | Chưa thực hiện; sẽ phân biệt với Playwright tự động. |
| Bàn giao | OUTPUT và phạm vi sửa | unresolved | Chưa hoàn tất. |
| Cleanup baseline | Không còn tiến trình kiểm thử và listener 4173 | pass | Sau baseline, truy vấn tiến trình theo command runner/test/check và TCP Listen 4173 đều không có kết quả. |
