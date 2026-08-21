import UIKit
import WebKit

class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, UIScrollViewDelegate {
    private var webView: WKWebView!
    private var activityIndicator: UIActivityIndicatorView!
    private var refreshControl: UIRefreshControl!
    private let appURL = URL(string: "https://zido-haccp.online/")!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        setupRefreshControl()
        setupActivityIndicator()
        loadApp()
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.javaScriptEnabled = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.scrollView.delegate = self
        webView.scrollView.bounces = true
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        webView.backgroundColor = UIColor(red: 0.05, green: 0.58, blue: 0.53, alpha: 1.0)
        webView.isOpaque = false

        view.addSubview(webView)
    }

    private func setupRefreshControl() {
        refreshControl = UIRefreshControl()
        refreshControl.tintColor = .white
        refreshControl.addTarget(self, action: #selector(refreshApp), for: .valueChanged)
        webView.scrollView.addSubview(refreshControl)
    }

    private func setupActivityIndicator() {
        activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.color = .white
        activityIndicator.hidesWhenStopped = true
        activityIndicator.center = view.center
        activityIndicator.autoresizingMask = [.flexibleLeftMargin, .flexibleRightMargin, .flexibleTopMargin, .flexibleBottomMargin]
        view.addSubview(activityIndicator)
    }

    private func loadApp() {
        activityIndicator.startAnimating()
        let request = URLRequest(url: appURL, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 30.0)
        webView.load(request)
    }

    @objc private func refreshApp() {
        webView.reload()
    }

    // MARK: - WKNavigationDelegate
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        activityIndicator.stopAnimating()
        refreshControl.endRefreshing()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        activityIndicator.stopAnimating()
        refreshControl.endRefreshing()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        activityIndicator.stopAnimating()
        refreshControl.endRefreshing()
        showOfflineAlert()
    }

    private func showOfflineAlert() {
        let alert = UIAlertController(
            title: "Connexion Requise",
            message: "Impossible de charger Zido HACCP. Vérifiez votre connexion Internet et réessayez.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Réessayer", style: .default, handler: { [weak self] _ in
            self?.loadApp()
        }))
        present(alert, animated: true)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}
