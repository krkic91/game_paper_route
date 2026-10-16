<!-- version v1.0 -->
# UNO

Mở **UNO** trong mục **Bài**, hoặc truy cập `/#play/uno`. Bản 2D chơi tại chỗ:
một người đấu ba máy, không cần đăng nhập hay kết nối mạng sau khi tải trang.
Chạm/click lá có viền sáng để đánh; có thể dùng Tab và Enter/Space để chọn các nút.
Khi đang thao tác trong bàn chơi, **D** rút bài và **U** hô UNO. Màu cũng có
tên bằng chữ trên từng lá và dưới chồng bài đã đánh.

## Luật của bản này

- Bộ 108 lá, bốn màu đỏ/vàng/xanh lá/xanh dương. Mỗi người bắt đầu với 7 lá.
  Lá mở đầu luôn là lá số; bạn đi trước. Mỗi ván xáo bài lại.
- Đánh lá cùng màu, cùng số hoặc cùng ký hiệu với lá trên bàn. **Đổi màu**
  được đánh bất cứ màu nào; chọn màu trước khi hoàn thành nước đi.
- **Cấm lượt** bỏ qua người kế tiếp. **Đảo chiều** đổi hướng chơi.
  **+2** và **+4** buộc người kế tiếp rút đủ bài và mất lượt. Không cộng dồn
  hình phạt, không đánh chen lượt và không đánh nhiều lá cùng lúc.
- Chỉ được đánh **+4** khi tay bài không có lá cùng màu đang chơi. Cùng số
  hoặc cùng ký hiệu nhưng khác màu không ngăn dùng +4. Trò chơi chặn lá +4
  sai luật, nên không có cơ chế đánh lừa hoặc thách thức +4.
- Có thể **Rút 1 lá** dù đang có lá hợp lệ. Sau khi rút, chỉ được đánh đúng
  lá vừa rút nếu hợp lệ; có thể giữ lá và qua lượt. Nếu lá không hợp lệ,
  lượt tự chuyển. Khi chồng rút hết, các lá đã đánh được xáo lại, giữ lá trên cùng.
- Khi còn hai lá, có thể bấm **UNO** trước khi đánh. Nếu đánh xuống còn một
  lá mà chưa hô, hãy bấm UNO trước khi máy hành động. Máy bắt lỗi quên hô
  và người chơi rút thêm 2 lá. Bạn có 3 giây thời gian chơi để hô sau khi
  xuống còn một lá; tạm dừng cũng dừng khoảng chờ này. Các đối thủ máy luôn hô UNO đúng lúc.
- Người hết bài trước thắng. Nếu lá cuối là +2/+4, người kế tiếp vẫn rút phạt
  trước khi tính điểm. Điểm thắng bằng tổng bài còn lại của đối thủ: lá số
  theo số, Cấm lượt/Đảo chiều/+2 mỗi lá 20, Đổi màu/+4 mỗi lá 50.
  Thư viện lưu kỷ lục khi bạn thắng; mỗi ván độc lập, không đấu tích lũy đến 500 điểm.

Luật cơ bản tham khảo [hướng dẫn UNO của Mattel](https://service.mattel.com/instruction_sheets/UNO%20Basic%20IS.pdf).
Các lựa chọn mở đầu bằng lá số, bạn đi trước, kiểm tra +4 tự động, máy luôn hô
UNO và tính riêng từng ván là quy ước của phiên bản này.

## Vòng đời ván chơi

Tạm dừng hoặc chuyển tab dừng cả lượt máy đang chờ. Chơi lại chia một ván mới.
Đóng game hoặc tải lại trang kết thúc ván hiện tại; tay bài không được lưu qua
lần mở lại. Game này chưa có chơi online hoặc nhiều người chung thiết bị.

## Kiểm thử

Kiểm tra luật không cần trình duyệt:

```bash
npm run test:uno
```

Sau khi cài Playwright và khởi động `npm start`, kiểm tra giao diện:

```bash
npm run test:uno:browser
```

Có thể đặt `TEST_URL` nếu dùng cổng khác. Các bài kiểm tra trình duyệt dùng
Chromium/WebKit và mô phỏng viewport/cảm ứng trên máy chạy kiểm thử. Đây không
phải máy ảo iPadOS hoặc kiểm tra trên iPhone/iPad thật.

- Kiểm tra luật gồm 16 bài, trong đó có 300 ván tự động với hạt ngẫu nhiên
  cố định: kết thúc ván, bảo toàn 108 lá, luật +4, rút/phạt, UNO và điểm thắng.
- Kiểm tra trình duyệt gồm lượt máy, bàn phím, chọn/hủy màu, UNO trước/sau
  khi đánh, quên hô, tạm dừng, chơi lại, đóng game, lưu điểm, thư viện và `file://`.
- Kích thước viewport: 320×740, 390×844, 768×1024, 820×1180, 1024×1366,
  1366×900 và 844×390; kiểm tra cả tay bài 25 lá và bảng chọn màu.
- Báo cáo JSON và ảnh nằm trong `test-results/uno-browser` (hoặc `SCREENSHOTS`).
  `UNO_BROWSERS=chromium` hoặc `webkit` giới hạn engine; `UNO_FUNCTIONAL_ONLY=1`
  chỉ chạy chức năng, `UNO_RESPONSIVE_ONLY=1` chỉ chạy bố cục. Không đặt đồng thời
  hai biến này. Có thể dùng `PLAYWRIGHT_MODULE` và `PLAYWRIGHT_BROWSERS_PATH` khi
  bộ công cụ Playwright được cài ở thư mục riêng.
