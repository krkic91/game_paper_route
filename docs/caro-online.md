<!-- version v1.0 -->
# Caro online — chạy và kiểm thử

Bản online cho phép hai người chơi trên hai thiết bị, dùng phòng riêng và mã/link mời.
Máy chủ Node.js phục vụ giao diện cùng endpoint WebSocket `/ws/caro`. Mã đã hỗ trợ
chạy cục bộ/LAN; chưa triển khai Internet vì chưa chọn hosting. Xem thêm
[kế hoạch đã thống nhất](caro-online-plan.md).

## Chạy trên máy tính

Cài Node.js 18 trở lên, mở PowerShell tại thư mục dự án và chạy:

```powershell
npm ci
npm start
```

Mở `http://127.0.0.1:4173`. Giữ terminal chạy trong lúc chơi; `Ctrl+C` dừng máy chủ.
`npm ci` cài dependency `ws` theo lockfile. Dự án không cần bước build.

Mặc định `HOST=127.0.0.1`, `PORT=4173`. Có thể chạy `node scripts/serve.js 8080`
để đổi cổng nếu chưa đặt biến `PORT`; biến môi trường `PORT` được ưu tiên.
Mở `index.html` trực tiếp hoặc dùng máy chủ tĩnh/Python chỉ chơi được các chế độ
offline, trừ khi frontend HTTP/HTTPS đã được cấu hình một backend riêng như bên dưới.

## Hai thiết bị trong cùng mạng LAN

1. Kết nối máy chạy server và hai thiết bị chơi vào cùng Wi-Fi/LAN.
2. Nếu server đang chạy, nhấn `Ctrl+C`, rồi chạy trong PowerShell tại thư mục dự án:

   ```powershell
   $env:HOST = '0.0.0.0'
   $env:PORT = '4173'
   npm start
   ```

3. Mở terminal khác, chạy `ipconfig` và lấy địa chỉ IPv4 của card mạng Wi-Fi/Ethernet
   đang kết nối, ví dụ `192.168.1.20`.
4. Trên **cả hai thiết bị**, mở `http://192.168.1.20:4173` (thay IP ví dụ bằng IP
   thật). Máy đang chạy server cũng nên dùng địa chỉ này để link mời có địa chỉ LAN.
5. Nếu thiết bị khác không mở được trang, kiểm tra máy chủ còn chạy, đúng IP/cổng,
   Windows Firewall cho phép Node.js hoặc cổng đã chọn trên mạng riêng và router
   không bật cách ly thiết bị Wi-Fi.

`0.0.0.0` là địa chỉ lắng nghe, không phải địa chỉ dùng để mời người chơi.
Link chứa `localhost`/`127.0.0.1` chỉ trỏ về chính thiết bị đang mở link.
Địa chỉ LAN không dùng được từ một mạng Internet khác.

## Tạo phòng và chơi

1. Mở **Caro**, chọn **Online**, nhập tên và bấm **Tạo phòng**.
2. Gửi mã phòng hoặc link mời cho người thứ hai. Người đó mở link, nhập tên rồi
   **Vào phòng**, hoặc tự nhập mã phòng trong chế độ Online.
3. Cả hai bấm **Sẵn sàng**. Phòng chỉ có hai chỗ; người thứ ba không thể vào.
4. Người mang quân X đi trước. Bàn 15 × 15, nối từ năm quân liên tiếp để thắng.
   Máy chủ kiểm tra lượt, ô trống và kết quả trước khi cập nhật bàn của hai người.
5. Sau khi ván kết thúc, cả hai đồng ý **Chơi tiếp** để bắt đầu ván mới và đổi X/O.

Chuyển giao diện 2D/3D giữ nguyên phòng và bàn cờ. Chế độ online không có tạm dừng
ván chung; phím `P` không dừng đối thủ. Nút chơi lại/phím `R` chỉ gửi yêu cầu chơi
tiếp sau khi kết thúc ván, cần đối thủ đồng ý. Rời phòng khi đang chơi có xác nhận
và được tính là bỏ cuộc.

## Mất mạng, tải lại trang và dữ liệu

- Máy chủ giữ chỗ trong **90 giây** sau khi phát hiện mất kết nối. Khi thiếu kết nối
  của một người, bàn không nhận nước mới; client tự thử kết nối lại.
- Tải lại cùng tab có thể khôi phục chỗ ngồi nhờ token trong `sessionStorage`.
  Khi kết nối lại, client lấy bàn mới nhất từ máy chủ; không tự gửi lại nước đi chưa
  rõ kết quả. Đóng tab hoặc xóa dữ liệu phiên có thể mất khả năng khôi phục chỗ.
- Hết thời gian giữ chỗ, người còn kết nối thắng. Nếu cả hai mất kết nối, ván kết
  thúc không có người thắng. Chủ động rời phòng xóa phiên khôi phục trên client.
- Token là quyền trở lại chỗ ngồi, **không chia sẻ token**. Link mời chỉ chứa mã
  phòng; đối thủ không nhận token của bạn trong trạng thái phòng.
- Phòng lưu trong RAM của **một tiến trình**, dọn sau **30 phút không hoạt động**.
  Khởi động lại/deploy lại server làm mất phòng; người chơi cần tạo phòng mới.
- Chưa có tài khoản, chat, xếp hạng, ghép đối thủ ngẫu nhiên hoặc lưu lịch sử ván
  trên máy chủ. Chạy nhiều tiến trình/replica cần bổ sung kho trạng thái dùng chung.

## Triển khai để chơi qua Internet

Hosting cần chạy được tiến trình Node.js liên tục và hỗ trợ WebSocket. Hosting
chỉ phục vụ file tĩnh không chạy được backend này. Cấu hình cần có:

- Cài dependency bằng `npm ci`, khởi động bằng `npm start`, đặt `HOST`/`PORT` theo
  nền tảng. Bản hiện tại chạy **một tiến trình/replica**.
- Cấp HTTPS cho trang và WSS cho WebSocket. Mặc định client tự dùng
  `wss://<host-của-trang>/ws/caro` khi trang được mở qua HTTPS.
- Nếu dùng reverse proxy, chuyển tiếp đường dẫn `/ws/caro`, hỗ trợ WebSocket
  Upgrade/Connection và thời gian kết nối dài; giữ `Host` gốc để kiểm tra Origin.
  Nếu proxy thay đổi Host, khai báo chính xác origin công khai bằng `ONLINE_ORIGINS`.
- Sau triển khai, kiểm tra hai thiết bị thật trên hai mạng khác nhau: tạo phòng,
  tham gia, nước đi, reload, gián đoạn mạng và chơi tiếp.

Nếu frontend và backend nằm ở hai host khác nhau, sửa meta trong `index.html`,
ví dụ (tên miền minh họa, thay bằng tên miền thực tế):

```html
<meta name="caro-websocket-url" content="wss://caro-api.example.com/ws/caro" />
```

Trên máy chủ backend, đặt origin của frontend trước khi chạy:

```powershell
$env:ONLINE_ORIGINS = 'https://game.example.com'
$env:HOST = '0.0.0.0'
$env:PORT = '4173'
npm start
```

`ONLINE_ORIGINS` là danh sách origin cách nhau bằng dấu phẩy, gồm scheme, hostname
và cổng nếu có; không thêm đường dẫn hay dấu `/` cuối. Ví dụ:
`https://game.example.com,https://play.example.com`. Máy chủ vẫn chấp nhận Origin
cùng Host theo mặc định. Trang HTTPS phải dùng WSS; endpoint WS không bảo mật sẽ
bị client từ chối.

Tài liệu trong `docs/`, mã server, tests và dependency không được phục vụ qua máy
chủ game; truy cập các đường dẫn này nhận 403 là chủ ý. Đọc tài liệu trong repo.

## Kiểm thử

Các bài kiểm thử luật game, vòng đời, client và server chạy bằng Node:

```powershell
npm ci
npm run check
npm test
```

Kết quả kiểm tra triển khai ngày **04/10/2026**: **64 bài kiểm thử đạt**. Các bài
server dùng HTTP/WebSocket thật với cổng tạm; các bài client kiểm tra quản lý phiên
và kết nối trong môi trường mô phỏng. Chúng bao gồm lượt sai, nước cũ/trùng, phòng
đầy, token riêng, reload, kết nối lại, hết hạn, bỏ cuộc và đổi quân khi chơi tiếp.

Cài công cụ kiểm thử trình duyệt tùy chọn; `pngjs` dùng cho kiểm thử ảnh border:

```powershell
npm install --no-save --package-lock=false playwright pngjs
npx playwright install chromium webkit
```

Chạy `npm start` trong một terminal. Trong terminal khác tại thư mục dự án:

```powershell
$env:TEST_URL = 'http://127.0.0.1:4173'
$env:ONLINE_BROWSER = 'chromium'
$env:ONLINE_WIDTH = '744'
$env:ONLINE_HEIGHT = '1133'
$env:ONLINE_TEST_3D = '1'
npm run test:online

$env:ONLINE_BROWSER = 'webkit'
$env:ONLINE_WIDTH = '1024'
$env:ONLINE_HEIGHT = '1366'
$env:ONLINE_TEST_3D = '0'
npm run test:online
```

`ONLINE_WIDTH`/`ONLINE_HEIGHT` là viewport của người chơi thứ hai; người thứ nhất
dùng viewport desktop 1280 × 900. Giá trị mặc định là Chromium, viewport thứ hai
744 × 1133 và không kiểm tra 3D. Trên Windows, Chromium dùng Edge nếu tìm thấy;
có thể đặt `BROWSER_PATH` để chọn executable khác. Biến này không áp dụng cho WebKit.
`ONLINE_TEST_3D=1` thêm bước chuyển 2D/3D, cần trình duyệt hỗ trợ WebGL.

Mỗi lượt chạy mở các browser context độc lập để tách dữ liệu hai người, cùng một
context thử phòng đầy. Test kiểm tra link mời, sẵn sàng, lượt, đồng bộ bàn, reload,
mất/kết nối mạng, thắng, chơi tiếp, đổi quân và bỏ cuộc. Ảnh nằm trong
`test-results/online/<browser>-<width>` hoặc thư mục đặt bằng `SCREENSHOTS`.

Kiểm tra hồi quy các game và border Caro:

```powershell
npm run test:browser
node tests/browser-caro.cjs
node tests/browser-caro-borders.cjs
```

Các bài Playwright chạy **trình duyệt headless trên Windows**, mô phỏng viewport,
DPR và cảm ứng. WebKit ở đây là bản do Playwright cung cấp; Chromium có thể là
Edge cài trên Windows. Không tạo máy ảo, không chạy iPadOS/Safari trên thiết bị
Apple thật. Kiểm thử hai browser context trên cùng máy cũng không thay thế việc
xác nhận hai thiết bị thật trên hai mạng Internet khác nhau sau triển khai.

### Kết quả đã thực hiện ngày 04/10/2026

Máy kiểm thử chạy Windows, Node.js 24.21.0, Playwright 1.55.1; backend thật chạy
tại `http://127.0.0.1:4183`. Không dùng máy ảo. Viewport dưới đây tính bằng CSS px,
context cảm ứng dùng DPR 2; đây là kích thước mô phỏng, không phải thiết bị thật.

| Kiểm thử | Cấu hình | Kết quả |
| --- | --- | --- |
| Luật, vòng đời, server/client | `npm test` | 64/64 đạt |
| Hồi quy trình duyệt | Cả 10 game, giao diện mobile, `file://` | Đạt |
| Caro online | Edge Chromium 154.0.4258.53, desktop 1280 × 900 + cảm ứng 744 × 1133, đổi 2D/3D | Đạt |
| Caro online | WebKit 26.0, desktop 1280 × 900 + cảm ứng 390 × 844 | Đạt |
| Caro online | WebKit 26.0, desktop 1280 × 900 + cảm ứng 744 × 1133 | Đạt |
| Caro online | WebKit 26.0, desktop 1280 × 900 + cảm ứng 1024 × 1366 | Đạt |
| Border Caro | WebKit + Chromium, 18 cấu hình, 180 ảnh | Đạt |

Kiểm thử border chạy lại các kích thước 744 × 1133, 768 × 1024, 810 × 1080,
820 × 1180, 834 × 1194 và 1024 × 1366. Với chiều rộng 744, 834 và 1024, test dùng
cả cấu hình trang mobile và desktop. Mỗi cấu hình kiểm tra 10 ảnh qua thao tác
chạm, click/focus, quay ngang/dọc và máy đáp lượt, với hiệu ứng mặc định.
Mỗi ảnh lấy mẫu 2.100 vị trí đường kẻ. Kết quả chi tiết lưu cục bộ tại
`test-results/caro-borders-online-regression/results.json` và ảnh cùng thư mục.

Trong kiểm thử online, các context tách `sessionStorage`/`localStorage` để mô phỏng
hai người độc lập. Test tạo phòng, mở link mời, thử người thứ ba, bắt đầu khi cả
hai sẵn sàng, đánh luân phiên, reload, bật/tắt mạng bằng Playwright, kết thúc ván,
đồng thuận chơi tiếp, đổi quân và bỏ cuộc. Test cũng so sánh bàn cờ của hai người
sau từng nước. Hiệu ứng được giảm trong bài online để thao tác ổn định; kiểm thử
border riêng vẫn dùng hiệu ứng mặc định.

Ảnh online nằm tại `test-results/online`, ảnh hồi quy 10 game tại
`test-results/online-regression`. Các thư mục kết quả được bỏ qua bởi Git.
