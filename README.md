<!-- version v1.0 -->
# Trạm Chơi

**Một trang, 10 game chơi được ngay.** Cổng mini game tiếng Việt, giữ nguyên **Delivery Dash** và bổ sung game thể thao, bàn cờ, arcade, trí tuệ. Không có tài khoản, quảng cáo, backend hay bước build.

## Chạy dự án

Cần **Node.js 18 trở lên** nếu dùng server và kiểm thử:

```bash
npm start
```

Mở **http://127.0.0.1:4173**. Không cần chạy `npm install` để chơi.

Các cách khác:

```bash
npm run dev
node scripts/serve.js 8080
python -m http.server 4173
```

Hoặc mở trực tiếp **`index.html`** bằng trình duyệt hiện đại. Tất cả script và hình minh họa SVG đều nằm trong dự án, không tải thư viện, font hoặc ảnh từ bên ngoài. Một số trình duyệt có thể hạn chế lưu dữ liệu ở chế độ `file://`; dùng server cục bộ để ổn định hơn.

## Danh sách game

| Game                | Chế độ                                        | Cách chơi chính                                                   |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| **Delivery Dash**   | 1 người                                       | Lái xe giao báo, né chướng ngại, hoàn thành tuyến đường gốc.      |
| **Đua xe đạp**      | Bạn đấu 3 đối thủ máy                         | Đua 1 km; quản lý năng lượng, nước rút, né cọc tiêu và vũng nước. |
| **Caro**            | Đấu máy / 2 người cùng thiết bị               | Bàn 15 × 15, nối từ 5 quân theo hàng ngang, dọc hoặc chéo.        |
| **Cờ cá ngựa**      | Bạn + 3 máy / 2 người / 4 người cùng thiết bị | Tung xúc xắc, xuất chuồng, đá ngựa và đưa đủ 4 ngựa về đích.      |
| **Ô ăn quan**       | Đấu máy / 2 người cùng thiết bị               | Chọn ô dân và hướng rải, ăn quân, tính điểm quan/dân.             |
| **Bida bỏ túi**     | Luyện tập 1 người                             | Ngắm từ bi trắng, chọn lực, đánh đủ 15 bi màu vào 6 lỗ.           |
| **Rắn săn mồi**     | 1 người                                       | Ăn trái cây, tránh tường và thân mình trên bàn 20 × 20.           |
| **2048**            | 1 người                                       | Trượt và gộp số; đạt 2048 có thể chơi tiếp.                       |
| **Lật thẻ trí nhớ** | 1 người                                       | Tìm 8 cặp trái cây trên 16 thẻ với ít lần lật nhất.               |
| **Phá gạch**        | 1 người                                       | Đỡ bóng, phá 50 viên gạch với 3 mạng.                             |

### Các biến thể luật được sử dụng

- **Caro tự do:** từ 5 quân là thắng, kể cả bị chặn hai đầu; không có nước cấm Renju. Máy ưu tiên thắng, chặn nước thắng rồi đánh giá thế cờ.
- **Cờ cá ngựa kiểu Ludo rút gọn:** ra 6 mới xuất chuồng và được thêm lượt; điểm sao an toàn; cần đúng số bước vào đích. Có thể xếp chồng quân, không chặn đường và không phạt ba lần ra 6. Ngựa đi một vòng 52 ô rồi vào 6 ô đường về màu riêng.
- **Ô ăn quan cơ bản:** 50 dân, 2 quan, mỗi quan 10 điểm. Có rải tiếp và ăn liên hoàn. Hàng sắp đi trống sẽ rải lại 5 dân và trừ 5 điểm, có thể ghi nợ bằng điểm âm. Ván kết thúc khi hai ô quan hoàn toàn trống, rồi thu dân còn lại ở hàng mình. Không áp dụng luật “quan non”.
- **Bida luyện tập:** có va chạm, bật băng, ma sát, vào lỗ và đặt lại bi trắng. Không dùng luật đấu 8-ball; bi đen có thể vào lỗ ở bất kỳ lượt nào. Mỗi bi màu +100, mỗi cú đánh −5, lỗi bi trắng −50, dọn bàn +500.
- Các chế độ nhiều người là **chơi chung thiết bị**, không phải multiplayer qua mạng.

Luật và điều khiển chi tiết luôn có trong nút **ⓘ Hướng dẫn** của mỗi game.

## Tính năng trang

- Thư viện 10 game với hình minh họa riêng, bố cục tương thích máy tính và điện thoại.
- Tìm kiếm tiếng Việt có dấu hoặc không dấu; lọc theo Arcade, Thể thao, Bàn cờ, Trí tuệ.
- Sắp xếp theo đề xuất, tên hoặc game mới chơi.
- Đánh dấu **yêu thích**, danh sách **chơi gần đây**, **kỷ lục riêng cho từng game**.
- Chơi ngẫu nhiên trong danh sách đang lọc; nếu danh sách trống, chọn từ toàn bộ thư viện.
- Game mở ngay trong trang; có tạm dừng, chơi lại, hướng dẫn, toàn màn hình (nếu trình duyệt hỗ trợ) và quay lại thư viện.
- Tự tạm dừng khi chuyển sang tab khác. Khi thoát, game giải phóng vòng lặp, bộ hẹn giờ và sự kiện điều khiển.
- URL trực tiếp, ví dụ **`/#play/caro`**, **`/#play/pool`**, **`/#play/delivery`**.

### Phím tắt

| Phím                    | Chức năng                                                  |
| ----------------------- | ---------------------------------------------------------- |
| `/` hoặc `Ctrl/Cmd + K` | Tìm kiếm trên trang thư viện                               |
| `P`                     | Tạm dừng / tiếp tục game                                   |
| `R`                     | Chơi lại game hiện tại                                     |
| `Esc`                   | Quay lại thư viện (thoát toàn màn hình trước nếu đang bật) |

Game hành động có nút cảm ứng. Rắn và 2048 hỗ trợ vuốt. Bàn cờ hỗ trợ chạm/click; caro còn hỗ trợ mũi tên và Enter. Chế độ chơi đang chọn được giữ khi bấm Chơi lại.

### Dữ liệu

Yêu thích, lịch sử và kỷ lục nằm trong `localStorage` với khóa **`tramchoi.library.v1`**. Dữ liệu chỉ có trên trình duyệt/thiết bị hiện tại, không gửi lên máy chủ. Nếu lưu trữ bị chặn, game vẫn chơi được nhưng dữ liệu chỉ tồn tại trong phiên hiện tại. Tạm dừng không mất lượt máy hoặc thời gian lật thẻ; tải lại trang sẽ bắt đầu một ván mới.

## Delivery Dash nguyên bản

- **`core.js`** giữ nguyên logic game gốc.
- **`game.js`** giữ gameplay và hình ảnh gốc; chỉ bổ sung kết nối tạm dừng, chơi lại, phím tắt, lưu điểm với trang chung và xóa phím đang giữ khi mất focus.
- **`delivery.html`** và **`delivery.css`** chứa màn chơi gốc, được mở trong iframe riêng để tránh xung đột biến và sự kiện với game khác.
- Vẫn có thể mở **`delivery.html`** để chơi độc lập.
- Xem [hướng dẫn đầy đủ của Delivery Dash](docs/delivery-dash.md).

## Cấu trúc

```text
index.html              Trang thư viện + cửa sổ chơi game
styles.css              Giao diện cổng game, responsive
arcade.js               Danh sách game, tìm kiếm, lọc, lưu dữ liệu, điều hướng
art.js                  Icon, hình minh họa SVG cục bộ
assets/favicon.svg      Biểu tượng trang

games/
  logic.js              Luật game và vật lý độc lập với DOM, xuất được cho Node
  shared.js             Vòng đời, pause, timer, input, canvas và UI dùng chung
  boards.js             Caro, cá ngựa, ô ăn quan, 2048, lật thẻ
  action.js             Đua xe đạp, bida, rắn, phá gạch
  games.css             Giao diện các màn chơi

delivery.html           Trang Delivery Dash gốc
delivery.css            CSS riêng cho Delivery Dash
core.js                 Logic Delivery Dash gốc
game.js                 Canvas Delivery Dash + kết nối với cổng game

scripts/serve.js         Server cục bộ bằng thư viện chuẩn Node
scripts/check.js         Kiểm tra cú pháp JavaScript
tests/core.test.js       Kiểm thử hồi quy Delivery Dash
tests/arcade.test.js     Luật game, AI, vật lý, kết thúc ván
tests/lifecycle.test.js  Pause, hủy timer, gỡ input và giải phóng game
tests/browser-smoke.cjs  Kiểm tra trình duyệt tùy chọn
```

## Kiểm thử

Không cần cài dependency:

```bash
npm run check
npm test
```

Bộ kiểm thử kiểm tra thắng/thua, luật di chuyển, AI, va chạm, bảo toàn điểm ô ăn quan, sinh ô mới, lật thẻ, pause và giải phóng tài nguyên. Các bài kiểm thử Delivery Dash ban đầu vẫn được giữ lại.

### Kiểm tra trình duyệt (tùy chọn)

Cài Playwright **chỉ để chạy kiểm thử**, không phải dependency của trang:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
```

Chạy `npm start` ở một terminal, rồi ở terminal khác:

```bash
npm run test:browser
```

Trên Windows, script tự dùng Edge nếu có. Có thể chỉ định `BROWSER_PATH` (đường dẫn executable) và `TEST_URL` nếu cần. Kiểm thử mở cả 10 game, chơi các lượt mẫu, kiểm tra AI, tìm kiếm không dấu, yêu thích, lưu kỷ lục, tạm dừng/chơi lại, màn hình điện thoại và mở trực tiếp `file://`. Ảnh chụp lưu trong thư mục tạm `tram-choi-screenshots`, hoặc đường dẫn do biến `SCREENSHOTS` chỉ định.

Kiểm tra riêng đường kẻ Caro trên WebKit và Chromium ở kích thước iPhone/iPad, gồm chạm ô, bàn phím, chơi lại và máy đáp lượt:

```bash
npx playwright install webkit chromium
node tests/browser-caro.cjs
```

Script kiểm tra vị trí, kích thước của cả 225 ô và khoảng cách đường kẻ trước/sau mỗi nước đi. Có thể đặt `CARO_BROWSERS=webkit` hoặc `CARO_BROWSERS=chromium` để chạy riêng một trình duyệt; `TEST_URL` và `BROWSER_PATH` dùng như trên (`BROWSER_PATH` chỉ áp dụng cho Chromium). Đây là mô phỏng trình duyệt, không thay thế kiểm tra trên thiết bị Apple thật.

Kiểm tra thêm màu đường kẻ trong ảnh chụp ở kích thước iPad mini/Pro, với hiệu ứng chuyển động mặc định, thao tác chạm/click và đổi ngang/dọc ngay trong ván:

```bash
npm install --no-save --package-lock=false playwright pngjs
node tests/browser-caro-borders.cjs
```

Script lấy mẫu 2.100 vị trí trên đường kẻ trong mỗi ảnh, chạy WebKit và Chromium với DPR 2, cùng cấu hình trang di động và desktop. Ảnh và kết quả JSON được lưu tại `test-results/caro-borders` (hoặc `CARO_BORDER_OUTPUT`). Có thể chọn kích thước bằng `CARO_WIDTHS=744,834,1024`; `CARO_CSS_FILE` cho phép đối chiếu một bản CSS cũ. User-agent iPad/Safari trong test chỉ mô phỏng thông tin trình duyệt, không chạy iPadOS hay Safari trên thiết bị thật.
