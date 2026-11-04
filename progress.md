# Tiến độ harness

## Cờ tỷ phú — đợt 1 đã hoàn tất, 01/11/2026

- Đã duyệt 4 đề xuất đầu. Đã đọc sources và skill harness; không có AGENTS.md trong repo. Đã lưu hash các thay đổi có trước và snapshot adapter/CLAUDE.
- Thiết kế: preview chỉ đọc dùng cùng luật thuê, cảnh báo dự phòng dưới 160 xu không chặn mua/xây; bảng A–G dẫn tới phần xem/xác nhận; thông tin lượt nằm ngoài nguồn 3D bị ẩn; thông báo lấy từ giao dịch thực tế, không tính thanh lý hai lần.
- Baseline 21/21 đạt; implementation-unit 30/30 đạt, gồm 300 ván cũ và test query/receipt/adapter mới. Browser feature-browser đạt 6/6 cấu hình 1280/390/320 × 2D/3D, errors=[].
- Đã xem ảnh mobile: preview mua/xây và nút xác nhận rõ; nhãn chủ đất 3D còn nhỏ. Vòng hiệu chỉnh 1/3 đổi chữ dài sang huy hiệu số 1–4 có chú giải ngoài bàn. Chỉ chạy lại browser 3D bị ảnh hưởng; luật/tiền/AI không đổi.
- owner-badges-browser đạt 3/3 cấu hình 3D cuối (34.644 ms), errors=[]; đã xem ảnh 320 px của huy hiệu, chú giải và bảng thanh lý. Giao diện 2D không thay đổi hành vi trong vòng hiệu chỉnh này.
- Đã cập nhật docs/monopoly.md và quy tắc CLAUDE. Đang chạy full suite, tiếp theo cú pháp/report/audit. Ledger riêng, không mở server phát triển.
- Full suite lần đầu: 442/443 đạt; lỗi duy nhất ở tests/online-server.test.cjs:249, expected SERVER_BUSY, actual undefined, với fixture idleMs=100. Lỗi cùng dạng từng xuất hiện ở harness Ma sói; không sửa backend hoặc test Caro. Chạy riêng test resource-limit để xác định khả năng tái hiện, rồi kiểm tra lại full suite trong ngân sách.
- Cô lập Caro đạt 1/1 (540 ms); full suite lần hai đạt 443/443, exit 0 (107.649 ms). Cú pháp cuối đạt, exit 0 (30.956 ms); không có script lint. Tổng kiểm thử 358.179 ms trước audit, 1 vòng chỉnh giao diện; đã viết docs/monopoly-verification.md. Đang chốt hash/phạm vi/cleanup cuối.
- Audit cuối đạt: 25 file từ các task trước giữ nguyên hash, adapter các game khác giữ nguyên; không ngoài phạm vi, mọi output/liên kết tồn tại, diff check exit 0; không Node kiểm thử/Edge Playwright/listener 4173. Tổng gồm audit 361.771 ms (~6 phút 2 giây), 1/3 vòng chỉnh giao diện. Hoàn tất và bàn giao docs/monopoly-verification.md; không tạo/sửa AGENTS.md.

## Domino / Bida — đợt 1 đã triển khai, 30/10/2026

- Đã duyệt, đặc biệt nút Gợi ý Domino là thao tác chủ động; không gợi ý tự động hoặc tự đánh.
- Giữ thay đổi Ma sói, ledger cũ. Baseline đạt; unit sau triển khai 77/77 (gồm 300 ván Domino, hình học Bida và adapter Ma sói).
- Domino: nút gợi ý/xác nhận riêng, xóa khi đổi lượt hoặc chơi lại; thông tin công khai và quân tay 2D vẫn hiện trong 3D. Browser 6/6 ở 1280/390/320 đạt.
- Bida: ngắm tinh/giữ nút, khóa hướng, hướng bi mục tiêu chung 2D/3D, bố cục gọn. Vòng sửa 1/3: browser dùng sai inputValue cho output (lỗi test); đổi sang textContent. Tăng specificity CSS để bố cục Bida không bị CSS 3D chung ghi đè.
- Bida đạt 5/6 lượt browser; đã xem ảnh 3D 390 px và 2D 320 px, điều khiển sát bàn, không tràn ngang. Vòng sửa 2/3: ngưỡng đo góc của test quá chặt cho tọa độ chuột lượng tử theo pixel ở 320 px; dùng sai số góc tương đương 2 CSS pixel. Không đổi cách ngắm của game.
- Bida 3D 320 px chạy lại đạt. Tổng hợp 12/12 cấu hình browser; errors=[] ở cả ba báo cáo, cảnh 3D được giải phóng khi đóng game.
- Toàn suite cuối 434/434 đạt, exit 0, 106.111 ms; cú pháp exit 0, 26.291 ms. Không có script lint. Tổng kiểm thử 218.733 ms, 2/3 vòng hiệu chỉnh.
- Đã viết docs/domino-pool-verification.md, docs/pool.md, cập nhật docs/domino.md và quy tắc CLAUDE (diff riêng trong evidence). Audit cuối đạt: 9 file Ma sói giữ nguyên hash; file adapter chỉ sửa một dòng Domino, không ngoài phạm vi; output/liên kết/diff check đạt; không còn test Node/Edge hoặc listener 4173. Tổng gồm audit 221.690 ms, 2/3 vòng; hoàn tất, không mở server phát triển.

## Ma sói — đã bàn giao đợt 1, 30/10/2026

- Người dùng đã duyệt triển khai bốn phần trong plan. Chưa có thay đổi trước khi phiên bị gián đoạn; đã xác nhận lại Git sạch rồi tiếp tục.
- Nguồn xác nhận renderer dùng `is-eliminated`, adapter 3D kiểm tra `is-dead`.
- Thiết kế: phát biểu tùy chọn, tối đa 2 lần/ngày, nhận vai chưa xác thực; bảng phiếu chỉ công khai sau chốt. Máy dùng góc nhìn riêng đã lọc.
- Baseline 14/14 unit đạt. Adapter baseline fail đúng lỗi: vẫn có 8 mô hình khi một người bị loại; đã sửa và test đạt 1/1.
- Logic mới đạt 23/23, gồm 300 ván cũ + 100 ván có phát biểu; kiểm tra fake claim không dò vai bí mật, lý do công khai, phiếu theo ngày và tác động đến máy.
- Browser mới đạt 6/6 ở 1280/390/320 px × 2D/3D; thao tác nghi ngờ, nhận vai giả, bênh vực, giới hạn theo ngày, xem phiếu, pause/restart/close và chọn người trực tiếp trên canvas 3D. Đã xem ảnh mobile của phát biểu, bảng phiếu và cảnh người bị loại.
- Đã cập nhật hướng dẫn và quy tắc bền vững trong CLAUDE. Một vòng sửa lỗi 3D đã tái hiện (1/3); không cần vòng sửa bổ sung sau triển khai.
- Suite đầu đạt 422/423, fail ở test Caro giới hạn tài nguyên: kỳ vọng SERVER_BUSY nhưng phản hồi không có mã đó (online-server.test.cjs:249). Test cấu hình idle 100 ms; có thể nhạy thời điểm, chưa chứng minh nguyên nhân.
- Chạy riêng đúng test này đạt 1/1 (0.711 giây). Không sửa Caro. Syntax đạt (30.481 giây). Sau gián đoạn, xác nhận ledger đã ghi kết quả; không chạy lại syntax.
- Toàn suite xác nhận đạt 423/423, không skip, exit 0, 106.733 giây (`final-serial-recheck`). Không chạy npm test mặc định; dùng cờ tuần tự đã ghi trong plan. Lần không đạt đầu được giữ nguyên bằng chứng.
- Tổng 9 lượt kiểm thử 289.286 giây; thêm cleanup 2.082 giây = 291.368/1.800 giây (4 phút 51.368 giây).
- Đã chốt docs/werewolf-verification.md, metadata, hướng dẫn và diff CLAUDE. Git diff --check đạt; 14 tệp thay đổi đúng phạm vi; không sửa AGENTS.md.
- final-cleanup.json không có tiến trình test/browser/server hoặc listener các cổng đã kiểm tra. Không còn công việc chạy nền. Giới hạn còn lại: chưa đánh giá cân bằng dài hạn, chưa thử điện thoại thật/engine ngoài Chromium; nguyên nhân test Caro lần đầu chưa được chứng minh.

## Lịch sử các lượt trước

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
