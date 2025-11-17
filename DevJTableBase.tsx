# -------------------------------
# 1. Dane testowe (wszystkie <200 m)
# -------------------------------
d <- data.frame(
  id        = 1:6,
  lon       = c(21.0122,
                21.0126, 21.0118,
                21.0120, 21.0124,
                21.0119),
  lat       = c(52.2297,
                52.2299, 52.2294,
                52.2298, 52.2296,
                52.2295),
  odleglosc = c(0, 40, 80, 120, 160, 180)
)

library(leaflet)
library(htmlwidgets)

# -------------------------------
# 2. Budynek referencyjny
# -------------------------------
b_ref <- d[d$odleglosc == 0, ][1, ]

# -------------------------------
# 3. Tworzenie mapy
# -------------------------------
m <- leaflet(d) |>
  addTiles() |>
  addCircleMarkers(
    lng = ~lon,
    lat = ~lat,
    radius = 6,
    stroke = TRUE,
    weight = 1,
    color = ~ifelse(odleglosc == 0, "red", "blue"),
    fillColor = ~ifelse(odleglosc == 0, "red", "blue"),
    fillOpacity = 0.9,
    popup = ~paste0(
      "<b>ID:</b> ", id,
      "<br><b>Odległość:</b> ", odleglosc, " m"
    )
  ) |>
  addCircles(
    lng    = b_ref$lon,
    lat    = b_ref$lat,
    radius = 200,
    color  = "red",
    weight = 2,
    fill   = FALSE
  )

# -------------------------------
# 4. Zapis do pliku
# -------------------------------
saveWidget(m, "mapa.html", selfcontained = TRUE)
