# Checks — giao báo / đua xe, 29/10/2026

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
