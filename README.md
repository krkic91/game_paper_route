<!-- version v1.0 -->
# Trạm Chơi

**Một trang, 14 game chơi được ngay.** Cổng mini game tiếng Việt, giữ nguyên **Delivery Dash** và bổ sung game thể thao, bàn cờ, arcade, trí tuệ. Caro có chế độ online hai người khác thiết bị qua máy chủ Node.js. Không có tài khoản, quảng cáo hay bước build.

## Chạy dự án

Cần **Node.js 18 trở lên**. Cài dependency rồi chạy máy chủ giao diện và Caro online:

```bash
npm ci
npm start
```

Mở **http://127.0.0.1:4173**. Dependency chạy máy chủ là `ws`; trình duyệt dùng WebSocket có sẵn.

Các cách khác:

```bash
npm run dev
node scripts/serve.js 8080
python -m http.server 4173
```

`npm run dev` và `node scripts/serve.js 8080` cũng chạy được online. Máy chủ tĩnh như `python -m http.server 4173` hoặc mở trực tiếp **`index.html`** chỉ phục vụ các chế độ chơi offline. Tất cả script và hình minh họa SVG đều nằm trong dự án, không tải thư viện, font hoặc ảnh từ bên ngoài. Một số trình duyệt có thể hạn chế lưu dữ liệu ở chế độ `file://`; dùng server cục bộ để ổn định hơn.

Để chơi Caro trên hai thiết bị, xem [hướng dẫn Caro online, LAN và triển khai](docs/caro-online.md). [Kế hoạch triển khai](docs/caro-online-plan.md) lưu kiến trúc và phạm vi đã thống nhất.

## Danh sách game

| Game                | Chế độ                                        | Cách chơi chính                                                   |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| **Delivery Dash**   | 1 người                                       | Lái xe giao báo, né chướng ngại, hoàn thành tuyến đường gốc.      |
| **Đua xe đạp**      | Bạn đấu 3 đối thủ máy                         | Đua 1 km; quản lý năng lượng, nước rút, né cọc tiêu và vũng nước. |
| **Caro**            | Đấu máy / 2 người cùng thiết bị / online       | Bàn 15 × 15, nối từ 5 quân theo hàng ngang, dọc hoặc chéo.        |
| **Cờ vua**          | Đấu máy Dễ/Vừa / 2 người cùng thiết bị · 2D   | Chiếu hết vua; có nhập thành, bắt tốt qua đường, phong cấp.    |
| **Cờ tướng**        | Đấu máy Dễ/Vừa / 2 người cùng thiết bị · 2D   | Phối hợp Xe, Pháo, Mã; chiếu bí hoặc khiến đối thủ hết nước đi. |
| **Cờ cá ngựa**      | Bạn + 3 máy / 2 người / 4 người cùng thiết bị | Tung xúc xắc, xuất chuồng, đá ngựa và đưa đủ 4 ngựa về đích.      |
| **Ô ăn quan**       | Đấu máy / 2 người cùng thiết bị               | Chọn ô dân và hướng rải, ăn quân, tính điểm quan/dân.             |
| **Bida bỏ túi**     | Luyện tập 1 người                             | Ngắm từ bi trắng, chọn lực, đánh đủ 15 bi màu vào 6 lỗ.           |
| **Rắn săn mồi**     | 1 người                                       | Ăn trái cây, tránh tường và thân mình trên bàn 20 × 20.           |
| **2048**            | 1 người                                       | Trượt và gộp số; đạt 2048 có thể chơi tiếp.                       |
| **Sudoku**          | 1 người · 2D · Dễ / Vừa / Khó                  | Điền số 1–9 vào bàn 9 × 9, không trùng hàng, cột và khối 3 × 3.    |
| **Xếp cún**         | 1 người · 2D · 24 màn                         | Mỗi hàng, cột và vùng màu có một cún; các cún không chạm nhau.    |
| **Lật thẻ trí nhớ** | 1 người                                       | Tìm 8 cặp trái cây trên 16 thẻ với ít lần lật nhất.               |
| **Phá gạch**        | 1 người                                       | Đỡ bóng, phá 50 viên gạch với 3 mạng.                             |

### Các biến thể luật được sử dụng

- **Caro tự do:** từ 5 quân là thắng, kể cả bị chặn hai đầu; không có nước cấm Renju. Máy ưu tiên thắng, chặn nước thắng rồi đánh giá thế cờ.
- **Cờ cá ngựa kiểu Ludo rút gọn:** ra 6 mới xuất chuồng và được thêm lượt; điểm sao an toàn; cần đúng số bước vào đích. Có thể xếp chồng quân, không chặn đường và không phạt ba lần ra 6. Ngựa đi một vòng 52 ô rồi vào 6 ô đường về màu riêng.
- **Ô ăn quan cơ bản:** 50 dân, 2 quan, mỗi quan 10 điểm. Có rải tiếp và ăn liên hoàn. Hàng sắp đi trống sẽ rải lại 5 dân và trừ 5 điểm, có thể ghi nợ bằng điểm âm. Ván kết thúc khi hai ô quan hoàn toàn trống, rồi thu dân còn lại ở hàng mình. Không áp dụng luật “quan non”.
- **Bida luyện tập:** có va chạm, bật băng, ma sát, vào lỗ và đặt lại bi trắng. Không dùng luật đấu 8-ball; bi đen có thể vào lỗ ở bất kỳ lượt nào. Mỗi bi màu +100, mỗi cú đánh −5, lỗi bi trắng −50, dọn bàn +500.
- **Caro online:** tạo phòng riêng, chia sẻ mã/link, cả hai sẵn sàng rồi chơi trên hai thiết bị. Máy chủ xác nhận lượt và kết quả. Chơi tiếp cần cả hai đồng ý và đổi X/O; chuyển 2D/3D giữ nguyên ván.
- Các chế độ nhiều người của **Cờ cá ngựa** và **Ô ăn quan** là chơi chung thiết bị.

Luật và điều khiển chi tiết luôn có trong nút **ⓘ Hướng dẫn** của mỗi game.

## Tính năng trang

- Thư viện 14 game với hình minh họa riêng, bố cục tương thích máy tính và điện thoại; 10 game có thêm bản 3D. Cờ vua, Cờ tướng, Sudoku và Xếp cún dùng bản 2D.
- Tìm kiếm tiếng Việt có dấu hoặc không dấu; lọc theo Arcade, Thể thao, Bàn cờ, Trí tuệ.
- Sắp xếp theo đề xuất, tên hoặc game mới chơi.
- Đánh dấu **yêu thích**, danh sách **chơi gần đây**, **kỷ lục riêng cho từng game**.
- Chơi ngẫu nhiên trong danh sách đang lọc; nếu danh sách trống, chọn từ toàn bộ thư viện.
- Game mở ngay trong trang; có tạm dừng, chơi lại, hướng dẫn, toàn màn hình (nếu trình duyệt hỗ trợ) và quay lại thư viện.
- Game offline tự tạm dừng khi chuyển sang tab khác. Caro online tiếp tục nhận trạng thái từ máy chủ; không có tạm dừng chung. Khi thoát, game giải phóng vòng lặp, bộ hẹn giờ và sự kiện điều khiển.
- URL trực tiếp, ví dụ **`/#play/caro`**, **`/#play/pool`**, **`/#play/delivery`**.

### Phím tắt

| Phím                    | Chức năng                                                  |
| ----------------------- | ---------------------------------------------------------- |
| `/` hoặc `Ctrl/Cmd + K` | Tìm kiếm trên trang thư viện                               |
| `P`                     | Tạm dừng / tiếp tục game                                   |
| `R`                     | Chơi lại game hiện tại                                     |
| `Esc`                   | Quay lại thư viện (thoát toàn màn hình trước nếu đang bật) |

Game hành động có nút cảm ứng. Rắn và 2048 hỗ trợ vuốt. Bàn cờ hỗ trợ chạm/click; caro còn hỗ trợ mũi tên và Enter. Chế độ chơi đang chọn được giữ khi bấm Chơi lại. Trong Caro online, phím `P` không tạm dừng ván; `R` gửi yêu cầu chơi tiếp khi ván đã kết thúc. Rời phòng trong ván có xác nhận và tính là bỏ cuộc.

### Dữ liệu

Yêu thích, lịch sử và kỷ lục nằm trong `localStorage` với khóa **`tramchoi.library.v1`**. Các dữ liệu này chỉ có trên trình duyệt/thiết bị hiện tại, không gửi lên máy chủ. Nếu lưu trữ bị chặn, dữ liệu chỉ tồn tại trong phiên hiện tại. Ở chế độ offline, tạm dừng không mất lượt máy hoặc thời gian lật thẻ; tải lại trang bắt đầu một ván mới, riêng Sudoku và Xếp cún khôi phục ván đã lưu.

Caro online gửi tên hiển thị và thao tác chơi đến máy chủ, lưu phòng trong RAM của một tiến trình. Token riêng để khôi phục chỗ ngồi nằm trong `sessionStorage`, không có trong link mời và không được chia sẻ. Tải lại cùng tab có thể trở lại ván trong thời hạn giữ chỗ **90 giây**. Phòng không hoạt động được dọn sau **30 phút**; khởi động lại máy chủ làm mất toàn bộ phòng.

## Cờ vua và Cờ tướng

Mở hai game trong mục **Bàn cờ**, hoặc dùng `/#play/chess` và `/#play/xiangqi`.
Chơi với máy ở mức **Dễ / Vừa**, hoặc chọn **2 người / 1 máy** để cùng chơi trên
một thiết bị. Người chơi đi trước với quân Trắng (cờ vua) hoặc Đỏ (cờ tướng).

- Chọn quân rồi chạm ô có chấm; ô bắt quân có vòng tròn. Bàn chỉ cho đi nước
  hợp lệ, đánh dấu nước vừa đi và báo khi Vua/Tướng bị chiếu.
- Dùng mũi tên để chọn ô, Enter hoặc Space để chọn/đi quân. **Xoay bàn** đổi góc
  nhìn; **Hoàn tác** lùi một nước khi chơi hai người, hoặc cả lượt bạn và máy.
- Máy Dễ nhìn một nước; máy Vừa xét cả nước đáp của đối thủ. Máy chọn trong các
  nước hợp lệ, tính giá trị quân và vị trí; phù hợp chơi giải trí.
- **Cờ vua:** có nhập thành hai phía, bắt tốt qua đường và bảng chọn Hậu/Xe/Tượng/Mã
  khi phong cấp. Chiếu hết thắng; bí nước không bị chiếu hòa. Tự hòa khi lặp thế
  ba lần, đủ 100 nửa nước không đi tốt/ăn quân, hoặc thiếu quân cơ bản (hai vua,
  vua và một quân nhẹ, chỉ còn tượng cùng màu ô). Các thế cờ chết phức tạp khác
  chưa được nhận diện. Lặp thế/50 nước áp dụng tự động thay cho yêu cầu hòa.
- **Cờ tướng:** Tướng/Sĩ trong cung, Tượng không qua sông và có cản mắt, Mã có cản
  chân, Pháo ăn qua đúng một ngòi, Tốt qua sông được đi ngang. Không để hai tướng
  đối mặt hoặc tự chiếu. Chiếu bí và bí nước đều thua; lặp thế ba lần tự hòa.
  Bản giải trí này chưa phân xử chiếu dai/đuổi dai theo luật giải đấu.
- Hai game không dùng đồng hồ; ván hiện tại nằm trong phiên chơi. Tải lại hoặc
  đóng/mở game bắt đầu ván mới. Tạm dừng giữ nguyên bàn và dừng lượt máy đang chờ.
  Thắng được 1.000 điểm; đấu máy chỉ ghi điểm khi người chơi thắng.

Luật di chuyển tham khảo [FIDE Laws of Chess](https://handbook.fide.com/chapter/e012023)
và [World Xiangqi Rules của WXF](https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf).
Các lựa chọn hòa tự động và phạm vi phân xử của bản này được nêu ở trên.

## Sudoku

Mở **Sudoku** trong mục **Trí tuệ**, hoặc truy cập `/#play/sudoku`. Chơi được
offline, bằng bàn phím hoặc chạm màn hình, không cần backend riêng.

- Ba mức Dễ / Vừa / Khó, với mục tiêu khoảng 42 / 34 / 28 ô cho sẵn. Độ khó dựa
  trên mật độ gợi ý; mỗi đề được kiểm tra để chỉ có một đáp án.
- Chọn ô rồi nhập số 1–9. Dùng mũi tên để di chuyển, Delete / Backspace để xóa,
  phím **N** bật/tắt ghi chú. Các công cụ cũng có nút cảm ứng.
- Số trùng hàng/cột/khối được đánh dấu. **Kiểm tra** chỉ ra số điền chưa đúng;
  **Gợi ý** điền đúng ô đang chọn, hoặc một ô chưa giải nếu ô đang chọn đã đúng.
- Hoàn tác tối đa 200 thao tác trong phiên chơi, bao gồm ghi chú tự xóa khi điền
  một số liên quan. Hoàn tác không hoàn lại số lần dùng gợi ý/kiểm tra.
- Đồng hồ bắt đầu khi nhập số, ghi chú hoặc dùng hỗ trợ; dừng khi tạm dừng,
  chuyển tab hoặc hoàn thành. Chơi lại/đổi độ khó tạo đề mới, có xác nhận nếu đang
  có tiến độ chưa hoàn thành.
- Tự lưu một ván vào `localStorage` với khóa **`tram-choi.sudoku.v1`**: bàn, ghi chú,
  thời gian và độ khó. Đóng game/tải lại trang có thể chơi tiếp; lịch sử hoàn tác
  không được lưu qua lần mở lại. Nếu trình duyệt chặn lưu trữ, vẫn chơi được trong
  phiên hiện tại.
- Điểm cơ bản 1.000 / 1.500 / 2.000 theo độ khó, trừ 100 mỗi gợi ý, 25 mỗi lần
  kiểm tra và 1 mỗi 10 giây chơi; tối thiểu 100. Hoàn thành ghi kỷ lục trên thiết bị.

## Xếp cún

Mở **Xếp cún** trong mục **Trí tuệ**, hoặc truy cập `/#play/puppies`. Game lấy cảm
hứng từ bàn cún nhiều vùng màu: mỗi hàng, cột và vùng phải có đúng một cún; hai
cún không được chạm nhau theo tám hướng. Cùng đường chéo nhưng cách xa vẫn hợp lệ.

- 24 màn có một đáp án: màn 1–6 dùng bàn 5 × 5, màn 7–12 dùng 6 × 6, màn 13–18
  dùng 7 × 7 và màn 19–24 dùng 8 × 8. Mỗi vùng màu là một nhóm ô liền nhau.
- Chọn **Đặt cún** hoặc **Đánh dấu ×**, rồi chạm/click ô. Đặt đúng cún tự hiện ×
  ở các ô bị loại trừ. Lấy cún ra sẽ gỡ các dấu tự động không còn cần thiết.
- Đặt sai đáp án mất một trong ba chiếc xương. Đánh dấu × hoặc chạm ô đã bị loại
  trừ tự động không mất xương. Hết xương có thể chơi lại cùng đề.
- Có gợi ý, hoàn tác và ký hiệu A–H giúp phân biệt vùng ngoài màu sắc. Hoàn tác
  không hoàn lại xương hoặc số lần gợi ý đã sử dụng.
- Dùng mũi tên để chọn ô, Enter để thao tác và phím X để đổi chế độ. Nút tạm dừng
  và các điều khiển chung hoạt động như những game khác.
- Tiến độ và lựa chọn ký hiệu vùng được lưu trên trình duyệt. Giải xong có thể
  sang màn tiếp theo; game chạy offline và không cần backend riêng.

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
  sudoku-logic.js        Sinh đề một đáp án, luật, ghi chú và kiểm tra bản lưu
  sudoku.js             Điều khiển Sudoku, đồng hồ và lưu ván
  sudoku.css            Bàn 9 × 9 và giao diện Sudoku responsive
  puppies-logic.js       Bộ màn, luật vùng màu, mạng chơi và khôi phục ván
  puppies.js            Điều khiển Xếp cún, gợi ý, lưu ván và chuyển màn
  puppies.css           Bàn nhiều màu và giao diện Xếp cún responsive
  chess-logic.js         Luật cờ vua, hoàn tác và máy tính nước
  xiangqi-logic.js       Luật cờ tướng, hoàn tác và máy tính nước
  royal.js              Giao diện hai bàn cờ, quân SVG, phong cấp và lượt máy
  royal.css             Bàn cờ và giao diện responsive
  online.js             Kết nối Caro online, phiên và khôi phục kết nối
  caro-online-ui.js     Giao diện phòng, sẵn sàng và chơi tiếp
  action.js             Đua xe đạp, bida, rắn, phá gạch
  games.css             Giao diện các màn chơi

delivery.html           Trang Delivery Dash gốc
delivery.css            CSS riêng cho Delivery Dash
core.js                 Logic Delivery Dash gốc
game.js                 Canvas Delivery Dash + kết nối với cổng game

server/caro-online.cjs   Máy chủ WebSocket xác nhận luật, lượt và trạng thái phòng
scripts/serve.js         Máy chủ HTTP và WebSocket Caro
scripts/check.js         Kiểm tra cú pháp JavaScript
tests/core.test.js       Kiểm thử hồi quy Delivery Dash
tests/arcade.test.js     Luật game, AI, vật lý, kết thúc ván
tests/lifecycle.test.js  Pause, hủy timer, gỡ input và giải phóng game
tests/online-server.test.cjs  Phòng, lượt, kết nối lại và hết hạn
tests/online-client.test.cjs  Phiên, yêu cầu và phục hồi client
tests/browser-online.cjs     Hai người chơi trong browser context độc lập
tests/browser-smoke.cjs  Kiểm tra trình duyệt tùy chọn
tests/puppies.test.cjs   Luật Xếp cún, 24 lời giải độc lập và khôi phục ván
tests/browser-puppies.cjs  Xếp cún trên Chromium/WebKit và màn hình cảm ứng
tests/chess.test.cjs     Perft, nhập thành, bắt tốt qua đường, phong cấp, kết quả
tests/xiangqi.test.cjs   Chân mã, ngòi pháo, cung/sông, chiếu, bí nước, AI
tests/browser-royal.cjs  Hai bàn cờ trên Chromium/WebKit, cảm ứng và lifecycle
```

## Kiểm thử

Sau khi chạy `npm ci`:

```bash
npm run check
npm test
```

Bộ kiểm thử kiểm tra thắng/thua, luật di chuyển, AI, va chạm, bảo toàn điểm ô ăn quan, sinh ô mới, lật thẻ, pause và giải phóng tài nguyên; đồng thời kiểm tra máy chủ/client Caro online, Sudoku, Xếp cún, Cờ vua và Cờ tướng. Các bài kiểm thử Delivery Dash ban đầu vẫn được giữ lại. Sau khi bổ sung hai bàn cờ ngày 06/10/2026: **123 bài kiểm thử đạt**.

### Kiểm tra trình duyệt (tùy chọn)

Cài Playwright **chỉ để chạy kiểm thử**, không phải dependency của trang:

```bash
npm install --no-save --package-lock=false playwright pngjs
npx playwright install chromium webkit
```

Chạy `npm start` ở một terminal, rồi ở terminal khác:

```bash
npm run test:browser
npm run test:online
npm run test:sudoku
npm run test:puppies
npm run test:royal
```

Trên Windows, script tự dùng Edge nếu có. Có thể chỉ định `BROWSER_PATH` (đường dẫn executable) và `TEST_URL` nếu cần. Kiểm thử mở cả 14 game, chơi các lượt mẫu, kiểm tra AI, tìm kiếm không dấu, yêu thích, lưu kỷ lục, tạm dừng/chơi lại, màn hình điện thoại và mở trực tiếp `file://`. Ảnh chụp lưu trong thư mục tạm `tram-choi-screenshots`, hoặc đường dẫn do biến `SCREENSHOTS` chỉ định.

`test:sudoku` chạy Chromium và WebKit: kiểm tra đề có một đáp án bằng bộ giải độc lập,
nhập số/ghi chú, hoàn tác, hỗ trợ, lưu/khôi phục ván, tạm dừng, hoàn thành và các viewport
320 × 740, 390 × 844, 744 × 1133, 1024 × 1366. Có thể đặt `SUDOKU_BROWSERS=webkit`
hoặc `chromium`; ảnh nằm trong `test-results/sudoku`. `npm test` bao gồm kiểm thử
logic Sudoku, dữ liệu lưu hỏng và tính duy nhất trên 60 đề sinh theo seed.

`test:puppies` giải cả 24 màn từ các vùng màu hiển thị bằng bộ giải độc lập trên
Chromium và WebKit. Script kiểm tra đặt cún/đánh dấu, mất xương, hoàn tác, gợi ý,
bàn phím, tạm dừng, thắng/thua, chuyển cấp, lưu/khôi phục và lưu trữ bị chặn.
Bàn 8 × 8 được kiểm tra cảm ứng, ô vuông không đổi kích thước và tràn ngang ở
320 × 740, 390 × 844, 744 × 1133, 1024 × 1366, 1180 × 820 và 844 × 390, DPR 2–3.
Có thể đặt `PUPPIES_BROWSERS=webkit` hoặc `chromium`. Ảnh và báo cáo `results.json`
nằm trong `test-results/puppies`, hoặc thư mục do `SCREENSHOTS` chỉ định.

`test:royal` chạy Cờ vua và Cờ tướng trên Chromium/WebKit: đi quân, ăn quân,
phong cấp có lựa chọn, nhập thành, bắt tốt qua đường, chiếu hết/lặp thế,
hoàn tác, tạm dừng lượt máy và đóng game khi máy đang chờ. Sáu cấu hình cảm ứng
là 320 × 740, 390 × 844, 744 × 1133, 1024 × 1366, 1180 × 820, 844 × 390,
DPR 2–3; kiểm tra ô vuông, không tràn ngang, chạm, lật bàn và hoàn tác.
Chọn riêng engine bằng `ROYAL_BROWSERS=chromium` hoặc `webkit`. Ảnh và báo cáo
JSON nằm ở `test-results/royal` (hoặc `SCREENSHOTS`). Unit test cờ vua đối chiếu
cây nước đi khai cuộc 20/400/8.902, thế nhập thành 48/2.039 và thế tàn cuộc
14/191/2.812; cờ tướng kiểm tra khai cuộc 44/1.920 cùng các tình huống đặc biệt.

`test:online` kiểm tra hai người chơi bằng browser context độc lập: mã/link mời, phòng đầy, sẵn sàng, đồng bộ nước đi, tải lại trang, mất/kết nối mạng, thắng, chơi tiếp và bỏ cuộc. Có thể chọn `ONLINE_BROWSER=webkit` hoặc `chromium`, đặt `ONLINE_WIDTH`/`ONLINE_HEIGHT` cho viewport của người thứ hai và `ONLINE_TEST_3D=1` để kiểm tra thêm đổi 2D/3D. Xem các lệnh PowerShell cụ thể trong [hướng dẫn kiểm thử online](docs/caro-online.md#kiểm-thử). Ảnh mặc định ở `test-results/online/<browser>-<width>`.

Các bài kiểm thử này chạy trình duyệt headless trên Windows với viewport, DPR và thao tác cảm ứng mô phỏng. Chúng không tạo máy ảo iPadOS và không chạy trên iPhone/iPad thật; vẫn cần kiểm tra thiết bị thật trước khi xác nhận tương thích phần cứng.

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
