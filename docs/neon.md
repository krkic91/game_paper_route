<!-- version v1.0 -->
# Neon Survivors

Game từ `Neon Survivors.html` được nhúng trực tiếp trong thư viện dưới nhóm
**Arcade**, đường dẫn `/#play/neon`. Thư viện hiện có 28 game. File HTML vẫn
chạy độc lập; không cần build hoặc dịch vụ bên ngoài. Font dùng các font hệ
thống dự phòng để không cần tải Google Fonts khi chơi.

## Chơi game

- Chọn Vega, Nova hoặc Atlas rồi bắt đầu. WASD/mũi tên để di chuyển; trên
  màn hình cảm ứng, kéo trên sân chơi để điều khiển. Nhân vật tự tấn công.
- Nhặt XP, chọn nâng cấp bằng cách chạm/click hoặc phím 1–3. Đạt phút thứ
  10 và đánh bại Neon Overlord để thắng, sau đó có thể chơi tiếp vô hạn.
- Nhặt vàng và mua nâng cấp ở menu giữa các ván. Vàng, nâng cấp, nhân vật,
  âm thanh và mức đồ họa tự lưu trên trình duyệt bằng khóa `tramchoi.neon.v1`.
  Đóng game/tải lại vẫn giữ dữ liệu này khi trình duyệt cho phép lưu trữ.
  Ván đang chơi chưa được lưu để tiếp tục sau khi đóng hoặc tải lại.
- Chọn đồ họa **Tự động / Thấp / Cao** ở menu hoặc màn tạm dừng trong game.
  Chất lượng thấp giảm độ phân giải và hiệu ứng, giữ nguyên số quái và luật.
  Tự động giảm chất lượng khi máy xử lý chậm kéo dài, có khoảng chờ trước
  khi nâng chất lượng lại để tránh đổi liên tục.
- **Xóa tiến trình** yêu cầu xác nhận, chỉ xóa vàng/nâng cấp/lựa chọn Neon;
  kỷ lục và các game khác của thư viện vẫn giữ nguyên. Nếu trình duyệt chặn
  lưu trữ, menu hiển thị thông báo và thay đổi chỉ giữ khi game còn mở.
- Trong thư viện: P tạm dừng/tiếp tục, R chơi lại với nhân vật đã chọn,
  Esc về thư viện. Các nút tương ứng trên thanh game cũng hoạt động.
- Khi mở HTML độc lập: P/Esc dùng menu tạm dừng riêng. Nút âm thanh nằm
  trong HUD. Kỷ lục thư viện lưu số hạ gục khi kết thúc ván vào dữ liệu
  `tramchoi.library.v1`, theo cơ chế lưu sẵn có của thư viện.

## Tích hợp và vòng đời

Metadata `frameSrc` trong `arcade.js` mở game bằng iframe, giống Delivery
Dash. Thông điệp `tramchoi:control` điều khiển tạm dừng/chơi lại;
`tramchoi:shortcut` chuyển phím tắt về thư viện; `tramchoi:score` gửi số hạ
gục. Hai bên kiểm tra nguồn cửa sổ và origin, gồm trường hợp mở `file://`.

Tạm dừng từ thư viện đóng băng vòng cập nhật bằng `hostPaused`, giữ nguyên
menu, màn chọn nâng cấp hay trạng thái tạm dừng riêng. Chơi lại dọn overlay
nâng cấp/tạm dừng và các phím/cần điều khiển đang giữ. Hiệu ứng Nova lần hai
dùng thời gian trong ván, được xóa khi chơi lại. Mất focus xóa điều khiển;
đổi tab tạm dừng. Đóng game gỡ iframe, giải phóng toàn bộ vòng lặp và âm thanh
của tài liệu con.

## Tối ưu vận hành

- Vàng được lưu ngay khi thu thập; không phụ thuộc thời gian chờ trước khi
  đóng iframe. Dữ liệu nạp vào được kiểm tra phiên bản, kiểu và giới hạn.
- Lưới không gian lọc ứng viên va chạm, sau đó vẫn dùng kiểm tra khoảng cách
  và thứ tự mục tiêu như trước.
- Vật thể ngoài khung nhìn được bỏ qua khi vẽ. Hiệu ứng dùng đường vector
  trực tiếp sau khi đối chiếu hiệu năng bitmap; HUD chỉ ghi lại giá trị thay đổi.
- Vòng mô phỏng dùng bước 1/60 giây, bù tối đa 250 ms mỗi khung để không
  tích lũy vô hạn khi máy treo. Không bù thời gian đã tạm dừng/ẩn tab.
- Màn tạm dừng, nâng cấp và kết thúc chỉ vẽ lại khi trạng thái/khung hình đổi.

Xem [phương pháp đo và kết quả tối ưu](optimization.md). Chạy bộ kiểm thử
bổ sung bằng `npm run test:neon-optimization`, bên cạnh `npm run test:neon`.

## Kiểm thử

Mở server bằng `node scripts/serve.js 4185`, đặt `TEST_URL` tương ứng rồi
chạy `npm run test:neon`. Nếu Playwright cài riêng, dùng `PLAYWRIGHT_MODULE`
và `PLAYWRIGHT_BROWSERS_PATH` như hướng dẫn kiểm thử trong README.

Kiểm thử dùng Chromium và WebKit headless trên Windows với viewport/cảm ứng
mô phỏng; không phải iPhone/iPad thật. Báo cáo và ảnh nằm ở
`test-results/neon/`. Các tình huống kết thúc/nâng cấp có dùng trạng thái
chuẩn bị sẵn để kiểm tra tích hợp, không thay thế việc chơi hết một ván
10 phút bằng tay.

### Kết quả xác nhận ngày 24/10/2026

- **10/10 lượt Neon đạt**: mỗi engine kiểm tra chức năng desktop 1366×900,
  điện thoại 390×844, tablet 820×1180, thư viện mở bằng `file://` và HTML độc
  lập. Có kiểm tra xoay ngang/dọc, input, pause, chọn nâng cấp, restart, thắng,
  thua, vô hạn, lưu kỷ lục và đóng iframe. Chromium kiểm tra cuộn menu bằng
  chuỗi sự kiện chạm CDP; WebKit kiểm tra cấu hình cuộn và thao tác chạm.
- **8/8 lượt thư viện đạt**: HTTP/`file://`, màn hình nhỏ/lớn trên hai engine,
  đủ 28 game và các bộ lọc. Bằng chứng: `test-results/neon-integration/library/`.
- **2/2 lượt hồi quy Delivery Dash đạt**: mở, pause, resume, gửi điểm,
  restart và đóng trên hai engine; bằng chứng ở
  `test-results/neon-integration/delivery.json`.

Phiên bản thực tế: Microsoft Edge/Chromium **155.0.4283.62**, WebKit **26.0**.
Đã sửa menu cảm ứng bị chặn cuộn, giữ điều khiển khi mất focus, overlay còn
sót khi restart, Nova chạy trễ ngoài thời gian ván và trường hợp thắng boss
bị ghi đè thành thua trong cùng frame. Test xoay màn hình chờ sự kiện resize
của iframe hoàn tất; test thoát chế độ vô hạn chấp nhận màn nâng cấp xuất
hiện ngay khi nhặt XP của boss.
