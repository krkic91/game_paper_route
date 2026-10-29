# Tiến độ harness — giao báo/đua xe, Caro và 2048

## Giao báo / đua xe — đã bàn giao cải tiến đợt 1

- Đã duyệt nút ném trái/phải, phản hồi mục tiêu; chỉ báo núp gió, cảnh báo đường,
  khoảng cách đối thủ. Người dùng phản hồi “tiếp tục” sau câu hỏi mở rộng tệp gốc.
  Đã sửa game.js/delivery.html/delivery.css; core.js không cần thay đổi.
- Baseline unit đạt 82/82; sau thêm 4 kiểm tra hướng dẫn đạt 86/86.
- Hai lượt browser đầu không đạt do fixture: AI rời làn làm mất núp gió sớm;
  reset giao báo tạo lại vật cản và pointer tổng hợp không có capture hợp lệ.
  Đã sửa fixture và dùng pointerdown thật; giữ log lỗi. Browser cuối đạt 12/12;
  4/4 lượt kiểm tra lại bố cục sau chỉnh nhãn tay đua cũng đạt.
- Sửa một lỗi input trong game.js: pointercancel/lostcapture không còn tạo lần ném.
  Ngân sách hiện tại theo `test-results/paper-route-verification/runs.json`;
  9 lượt dùng 882.715 giây, thêm cleanup cuối 1.757 giây: tổng 884.472/1.800
  giây (14 phút 44.472 giây); 2/3 vòng sửa mã sản phẩm.
- Chỉ sửa phần liên quan, giữ toàn bộ thay đổi có sẵn. Không mở server hoặc cài gói.
- OUTPUT: `docs/paper-route-verification.md`; bằng chứng riêng `test-results/paper-route-verification/`.
- npm test mặc định timeout ở 360 giây (362.982 gồm cleanup), chưa có tổng kết;
  giữ unresolved. Toàn suite chạy tuần tự đạt 414/414, không skip, exit 0,
  205.785 giây; `npm test -- --test-concurrency=1 --test-timeout=250000`.
- `npm run check` đạt, exit 0, 40.063 giây. Không có script lint.
- Đã chốt OUTPUT và metadata; diff quy tắc tại
  `test-results/paper-route-verification/CLAUDE-paper-route.diff`. Không sửa AGENTS.md.
- `final-cleanup.json`: không còn tiến trình test/browser của task hoặc listener
  4173/4174/3000/8080. Không còn kiểm thử đang chạy, không chạy lại lượt đã đạt.
- Còn mở: timeout toàn suite mặc định; chưa thử thiết bị thật/engine ngoài Chromium.
  Bàn giao kèm giới hạn này, không mở rộng sang game khác để xử lý timeout.

## Caro online — đã bàn giao, còn timeout toàn suite mặc định

- Người dùng gửi task Caro trong lúc baseline 2048 chạy. Đã lập plan Caro ở
  đầu `plan.md`, giữ nguyên nội dung plan 2048 ở phần lưu phía dưới.
- Người dùng đã phản hồi “duyệt”; 0/3 vòng sửa game/server vì chưa tái hiện lỗi kết nối.
- Baseline online: 16/16 pass, 2.461 giây. Baseline `npm test`: 405/405 pass,
  163.558 giây; baseline syntax pass, 125.922 giây. Ledger:
  `test-results/caro-online-verification/runs.json`.
- Đã quan sát tiến trình chạy lâu trong full suite là `tests/puppies.test.cjs`
  (đánh giá 500 đề), trong khi test Caro đã đạt. Chưa xác định chắc chắn nguyên nhân
  cấu hình mặc định timeout. Không sửa test/game không liên quan.
- Đã bổ sung khả năng chạy browser regression bằng hai tiến trình Edge/Chrome,
  helper backend cổng ngẫu nhiên có cleanup và bridge cho tương tác từng bước.
- Phạm vi và giới hạn cho task Caro trong plan đã được duyệt.
  Câu lệnh nhập lặp sau đó được người dùng yêu cầu bỏ qua, không áp dụng làm
  thay đổi phạm vi của plan đang chuẩn bị.
- Đã đọc harness, hướng dẫn Caro, server/client và tests liên quan. Đã dùng Edge và
  Chrome hệ thống với hai tiến trình, hai storage độc lập, cùng nền Chromium.
- Browser regression Edge + Chrome đã pass (63.881 giây), backend cổng 51400 đã đóng.
- Đã bổ sung 5 test deadline/reconnect/endpoint: 21/21 online pass (5.152 giây).
- Kiểm tra thao tác từng bước đã xác nhận tạo/join/ready, hai nước, reload giữ bàn.
  Phiên manual tự timeout và cleanup sau 603.429 giây trong thời gian gián đoạn;
  không có pageerror; phần mất/kết nối lại và rời phòng được kiểm tra ở lượt tiếp.
- Phiên manual-resume hoàn tất mất/kết nối lại, đánh tiếp, reload Edge và rời phòng;
  exit 0, 131.074 giây, không pageerror; backend 55987 đã đóng.
- Lượt `npm test` cuối timeout ở ngưỡng 360 giây, tổng 361.604 giây; các test online
  đã đạt nhưng không có kết quả toàn suite. Không sửa Xếp cún hoặc bỏ test để lấy pass.
- Syntax cuối pass, exit 0, 35.335 giây.
- Toàn suite cuối chạy tuần tự đạt **410/410**, exit 0, không skip, 182.531 giây:
  `npm test -- --test-concurrency=1 --test-timeout=250000`.
  Wrapper timeout 280 giây, không chạm giới hạn. Chỉ thay cách lập lịch file test,
  không thay nội dung test hoặc mã sản phẩm. Không coi đây là pass của lệnh mặc định.
- Tổng 10 lượt: **1.674,947 giây / 1.800 giây** (27 phút 54,947 giây); còn 125,053 giây.
  Đã kiểm tra ledger là mảng phẳng, nhãn duy nhất và thời lượng hữu hạn. Giữ bản
  trước chuẩn hóa PowerShell tại `runs.before-normalization.json`, không mất lượt chạy.
- OUTPUT đã chốt: `docs/caro-online-verification.md`; plan/checks/CLAUDE đã cập nhật.
  Diff quy tắc tại `test-results/caro-online-verification/CLAUDE-caro.diff`.
- Cleanup cuối: `final-cleanup.json` không có listener 4173/51400/51570/55987
  hoặc tiến trình test/server của task. Không sửa AGENTS.md, commit hay triển khai.
- Điểm còn mở: timeout toàn suite mặc định; chưa kiểm chứng LAN/Internet hoặc engine
  ngoài Chromium. Không có bản sửa production vì các luồng kết nối đã kiểm tra đều đạt.
- Bàn giao kết quả và giới hạn; không còn kiểm thử đang chạy, không chạy thêm lượt.

## 2048 — chưa hoàn tất, lưu để tiếp tục

- Plan đã được duyệt, bao gồm ba file ghi nhận harness ngoài phạm vi code.
- Đã thêm `tests/2048-harness.cjs` để đo ngân sách, timeout và lưu log; chưa sửa
  code game và chưa thực hiện kiểm tra riêng hoặc thủ công 2048.
- Vòng sửa đã dùng: **0/3**. Ngân sách đã dùng: **288.244 giây / 1.800 giây**.
- `npm test`: timeout ở ngưỡng 180 giây, đóng tiến trình sau tổng 182.660 giây;
  không có verdict toàn suite. Xem `test-results/2048/baseline-test.log`.
- `npm run check`: pass, exit 0, 105.584 giây. Xem `test-results/2048/baseline-syntax.log`.
- Ledger có thời điểm và exit code: `test-results/2048/runs.json`.
- OUTPUT 2048 chưa tạo. Cần xác minh nguyên nhân timeout và tiếp tục các bước
  của plan đã duyệt khi quay lại task; không đặt lại ngân sách.

## Môi trường và bảo toàn công việc

- Giữ nguyên các thay đổi từ công việc 3D trước đó.
- Trước đây sandbox shell lỗi khởi tạo; hiện môi trường đã cho phép chạy lệnh
  trực tiếp, không còn cần yêu cầu quyền cho mỗi lệnh.
- Kiểm tra cleanup cuối: không có tiến trình test/server của task còn chạy và
  không có listener trên cổng 4173 hoặc ba cổng backend tạm đã sử dụng.
