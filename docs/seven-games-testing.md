<!-- version v1.0 -->
# Kiểm thử bảy game mới

Báo cáo cập nhật ngày 22/10/2026. Đợt này mở rộng thư viện từ 20 lên 27 game:
Hải chiến, Dò mìn, Thủ thành, Nối thú, Xếp gạch rơi, Cờ lật và Cờ Thú.
Mỗi game có một agent riêng theo [phân công](seven-games-plan.md).

## Luật chơi

`npm run test:expansion`: **87/87 bài đạt**, không bỏ qua bài nào.

| Game | Số bài | Các kiểm tra chính |
| --- | ---: | --- |
| Hải chiến | 10 | Xếp tàu/va chạm, lượt bắn, trúng/chìm/thắng, không lộ tàu qua dữ liệu cấp cho AI; 240 ván có seed. |
| Dò mìn | 13 | Mở đầu an toàn, mở vùng, cắm cờ/chord, thắng/thua; 300 bàn giải bằng thông tin đã mở, kiểm chứng suy luận và phương án sinh dự phòng. |
| Thủ thành | 15 | Mua/nâng cấp/bán, tầm bắn, băng/pháo, thưởng một lần, boss, thất bại/thắng; chiến thuật thắng cả ba bản đồ và 24 ván thay thứ tự xây/bước thời gian. |
| Nối thú | 10 | Đối chiếu đường nối với BFS độc lập trên 1.500 bàn; 288 bàn có thứ tự giải và 288 ván lựa chọn ngẫu nhiên, ô băng, cứu bàn, công cụ và hết giờ. |
| Xếp gạch rơi | 13 | Túi bảy khối, xoay/va chạm, bóng rơi, giữ khối, xóa hàng/combo, khóa khối/chạm trần; 150 ván kiểm tra bảo toàn số ô. |
| Cờ lật | 11 | Bắt tám hướng, mép bàn, lượt bỏ qua, kết thúc/hòa, hoàn tác, AI; 200 ván đối chiếu bộ kiểm tra nước đi độc lập. |
| Cờ Thú | 15 | Sức mạnh, Chuột/Voi, sông và nhảy sông, bẫy/hang, hoàn tác/hòa/AI; 200 ván kiểm tra luật và bảo toàn quân. |

Ngoài ra, `node --test tests/core.test.js tests/arcade.test.js tests/lifecycle.test.js`
đạt **62/62 bài**, bao gồm các luật cũ và cơ chế dừng vòng lặp, timer, sự kiện
khi tạm dừng hoặc đóng game. Đây là nhóm kiểm tra hồi quy đã chạy trong đợt này;
không dùng con số này để khẳng định đã chạy lại toàn bộ bộ kiểm thử cũ.

## Trình duyệt và kích thước

Playwright **1.55.1**, Chromium qua Microsoft Edge **155.0.4283.62** và
WebKit **26.0**, chạy headless trực tiếp trên Windows. Không tạo máy ảo;
không kiểm tra trên iPhone/iPad vật lý hoặc Safari iOS thực tế.

Mỗi game chạy một kịch bản chức năng ở 1366×900 và bốn kịch bản bố cục:

| Viewport | Cảm ứng mô phỏng | DPR |
| --- | --- | ---: |
| 320×740 | Có | 2 |
| 390×844 | Có | 2 |
| 820×1180 | Có | 2 |
| 1366×900 | Không | 1 |

Bảy game × hai engine × năm kịch bản = **70 lượt đạt**. Các kịch bản kiểm tra
thao tác qua giao diện, điều kiện kết thúc/chơi lại, tạm dừng, đóng ván, lỗi
JavaScript/console, tràn ngang và tâm vùng bấm có bị che hay không. Một số bàn
cho phép cuộn ngang bên trong để giữ kích thước ô; trang không tràn ngang.
Các tình huống đặc biệt dùng trạng thái chuẩn bị sẵn trong test, còn thao tác
và xử lý kết quả chạy qua game thật. Các hook bắt trạng thái chỉ nằm trong
test; không thêm API debug vào game.

Thư viện chạy thêm **8 lượt đạt**: hai engine × hai kích thước 390/1366 ×
hai cách mở HTTP/`file://`. Kiểm tra đủ 27 thẻ không trùng id, hình bìa,
đăng ký game, lọc thể loại, tìm không dấu, mở/chạy/đóng cả bảy game và không
có lỗi tải tài nguyên. Tổng cộng **78 lượt kiểm tra trình duyệt**.

## Các vấn đề đã xử lý khi kiểm thử

- Hải chiến: phím R xoay tàu đồng thời kích hoạt phím chơi lại toàn thư viện.
  Đã chặn lan truyền sự kiện R trong pha xếp tàu và bỏ sự kiện lặp khi giữ phím.
- Dò mìn: test kiểm tra đồng hồ chạy lại sau đúng 150 ms không ổn định trên
  WebKit. Đã chờ điều kiện đồng hồ tăng với timeout hữu hạn; vẫn kiểm tra đồng
  hồ đứng yên trong lúc tạm dừng.
- Nối thú: test chờ cứng 420 ms có thể bấm gợi ý khi hoạt ảnh chưa kết thúc
  trên WebKit. Đã chờ trạng thái kết thúc hoạt ảnh trước thao tác tiếp theo.
- Xếp gạch rơi: bàn cao làm người chơi phải cuộn tới nút điều khiển, mất
  phần trên bàn. Bàn nay lấy kích thước từ vùng chơi thực tế, giữ tỷ lệ 10×20;
  có kiểm tra hình học để cả bàn và bảy nút tối thiểu 44×44 px cùng hiển thị.
  Test chạm trần chờ khối tự khóa, tránh tranh thời điểm giữa nút thả và
  màn hình kết quả khi trình duyệt chạy chậm.
- Cờ lật: bổ sung nền sáng cho vùng game và chỉnh màu chữ trạng thái để tiêu
  đề, lựa chọn chế độ và phần luật không chìm vào nền tối của thư viện.

## Chạy lại và xem bằng chứng

Mở server ở một terminal:

```powershell
node scripts/serve.js 4185
```

Chạy ở terminal khác, sau khi có Playwright và runtime tương ứng:

```powershell
$env:TEST_URL = 'http://127.0.0.1:4185'
$env:PLAYWRIGHT_MODULE = 'D:\1_Project\game_creator\test-results\caro-tooling\node_modules\playwright'
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\1_Project\game_creator\test-results\playwright-browsers'
npm run test:expansion
npm run test:expansion:browser
```

Đường dẫn Playwright trên là cấu hình thực tế của máy kiểm thử; máy khác có
thể cài `playwright` rồi bỏ `PLAYWRIGHT_MODULE` hoặc đặt đường dẫn tương ứng.
`BROWSER_PATH` chọn Chromium executable. `EXPANSION_GAMES` chọn danh sách id
cách nhau bằng dấu phẩy; `EXPANSION_BROWSERS` chọn `chromium` hoặc `webkit`.

Ảnh và báo cáo JSON từng lượt nằm ở `test-results/expansion-<id>/`,
thư viện ở `test-results/expansion/library/`. Các thư mục này là artifact
cục bộ, không phải tài nguyên cần tải lên hosting. Báo cáo JSON ghi phiên
bản engine, kích thước, loại kịch bản và lỗi nếu một lượt thất bại.
